import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address } from '@ton/core';
import { PrismaService } from '../../prisma/prisma.service';
import { DepositsService } from '../../deposits/deposits.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BlockchainWatcher } from '../interfaces/watcher.interface';
import { OnChainTransaction } from '../interfaces/network.interface';

const TON_USDT_DEFAULT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
const TON_DECIMALS = 6;
const TON_POLL_LIMIT = 200;
const TON_POLL_INTERVAL_MS = 30000;

type TonJettonTransfer = {
  amount: string;
  destination: string;
  jetton_master: string;
  memo?: string;
  source: string;
  transaction_hash: string;
  transaction_lt: string;
  transaction_now: number;
};

type TonTransaction = {
  mc_block_seqno?: number;
};

@Injectable()
export class TonUsdtWatcherService implements BlockchainWatcher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TonUsdtWatcherService.name);
  private readonly confirmationsRequired: number;
  private readonly depositAddress: string;
  private readonly normalizedDepositAddress: string;
  private readonly rpcUrl: string;
  private readonly usdtMasterAddress: string;
  private readonly normalizedUsdtMasterAddress: string;
  private readonly apiKey: string;
  private running = false;
  private pollInFlight = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSeenLt = 0n;

  constructor(
    private prisma: PrismaService,
    private depositsService: DepositsService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {
    this.confirmationsRequired = this.configService.get<number>('blockchain.ton.confirmationsRequired') || 6;
    this.depositAddress = this.configService.get<string>('blockchain.ton.depositAddress') || '';
    this.normalizedDepositAddress = this.normalizeAddress(this.depositAddress);
    this.rpcUrl = this.configService.get<string>('blockchain.ton.rpcUrl') || 'https://toncenter.com';
    this.usdtMasterAddress =
      this.configService.get<string>('blockchain.ton.usdtMasterAddress') || TON_USDT_DEFAULT_MASTER;
    this.normalizedUsdtMasterAddress = this.normalizeAddress(this.usdtMasterAddress);
    this.apiKey = this.configService.get<string>('blockchain.ton.apiKey') || '';
  }

  async onModuleInit() {
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  getNetworkName(): string {
    return 'TON';
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (!this.depositAddress) {
      this.logger.warn('BLOCKCHAIN_TON_DEPOSIT_ADDRESS not configured, watcher disabled');
      return;
    }

    this.running = true;
    this.logger.log(`Starting TON USDT watcher for ${this.depositAddress}`);
    try {
      await this.poll();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Initial TON poll failed: ${message}`);
    }

    this.intervalId = setInterval(() => {
      this.poll().catch((error) => {
        this.logger.error(`TON poll error: ${error.message}`);
      });
    }, TON_POLL_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async getLatestBlock(): Promise<number> {
    return this.fetchCurrentMasterchainSeqno();
  }

  async checkTransaction(_txHash: string): Promise<OnChainTransaction | null> {
    return null;
  }

  private async poll(): Promise<void> {
    if (!this.depositAddress || this.pollInFlight) return;
    this.pollInFlight = true;

    try {
      const deposits = await this.prisma.deposit.findMany({
        where: {
          network: 'TON',
          status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
          source_address: { not: null },
        },
      });

      if (deposits.length === 0) return;

      const trackedAddresses = new Set(
        deposits
          .map((deposit) => this.normalizeAddress(deposit.source_address || ''))
          .filter((address): address is string => Boolean(address)),
      );
      const trackedMemos = new Set(
        deposits
          .map((deposit) => (deposit.ton_deposit_memo || '').trim())
          .filter((memo): memo is string => Boolean(memo)),
      );

      if (trackedAddresses.size === 0 && trackedMemos.size === 0) return;

      const sinceTimestamp = this.getEarliestCreatedAtUnix(deposits);
      const currentMasterchainSeqno = await this.fetchCurrentMasterchainSeqno();
      const transfers = await this.fetchRecentUsdtTransfers(sinceTimestamp);

      for (const transfer of transfers) {
        const transferLt = BigInt(transfer.transaction_lt || '0');
        if (transferLt <= this.lastSeenLt) {
          continue;
        }

        const fromAddress = this.normalizeAddress(transfer.source || '');
        const sourceTracked = trackedAddresses.has(fromAddress);
        const transferMemo = (transfer.memo || '').trim();
        const enrichedMemo = transferMemo || (!sourceTracked && trackedMemos.size > 0
          ? await this.fetchTransactionMemo(transfer.transaction_hash)
          : '');
        const normalizedMemo = enrichedMemo.trim();
        const memoTracked = normalizedMemo ? trackedMemos.has(normalizedMemo) : false;

        if (!sourceTracked && !memoTracked) {
          this.lastSeenLt = transferLt > this.lastSeenLt ? transferLt : this.lastSeenLt;
          continue;
        }

        let txMasterchainSeqno = 0;
        let shouldAdvanceCursor = true;
        try {
          txMasterchainSeqno = await this.fetchTransactionMcSeqno(transfer.transaction_hash);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`TON tx ${transfer.transaction_hash} confirmations unavailable yet: ${message}`);
          shouldAdvanceCursor = false;
        }
        const confirmations =
          txMasterchainSeqno > 0 ? Math.max(currentMasterchainSeqno - txMasterchainSeqno, 0) : 0;

        const onChainTransaction = {
          txHash: transfer.transaction_hash,
          blockNumber: txMasterchainSeqno,
          fromAddress,
          toAddress: this.depositAddress,
          amount: this.formatTokenAmount(transfer.amount),
          tokenSymbol: 'USDT',
          confirmations,
          timestamp: new Date((transfer.transaction_now || Math.floor(Date.now() / 1000)) * 1000),
          network: 'TON',
          memo: normalizedMemo || undefined,
          rawPayload: JSON.stringify({ ...transfer, memo: normalizedMemo || undefined }),
        };

        await this.recordTransactionLog(onChainTransaction);
        await this.processDetectedTransfer(onChainTransaction);

        if (shouldAdvanceCursor) {
          this.lastSeenLt = transferLt > this.lastSeenLt ? transferLt : this.lastSeenLt;
        }
      }
    } finally {
      this.pollInFlight = false;
    }
  }

  private async fetchRecentUsdtTransfers(startUtime: number): Promise<TonJettonTransfer[]> {
    const headers = this.buildHeaders();
    const transfers: TonJettonTransfer[] = [];
    let offset = 0;

    while (true) {
      const url = new URL('/api/v3/jetton/transfers', this.rpcUrl);
      url.searchParams.set('owner_address', this.depositAddress);
      url.searchParams.set('jetton_master', this.usdtMasterAddress);
      url.searchParams.set('direction', 'in');
      url.searchParams.set('limit', String(TON_POLL_LIMIT));
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('sort', 'asc');
      url.searchParams.set('start_utime', String(startUtime));

      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error(`TON Center returned ${response.status}`);
      }

      const payload = (await response.json()) as { jetton_transfers?: TonJettonTransfer[] };
      const batch = payload.jetton_transfers || [];
      transfers.push(
        ...batch.filter(
          (transfer) =>
            this.normalizeAddress(transfer.destination || '') === this.normalizedDepositAddress &&
            this.normalizeAddress(transfer.jetton_master || '') === this.normalizedUsdtMasterAddress,
        ),
      );

      if (batch.length < TON_POLL_LIMIT) {
        break;
      }

      offset += TON_POLL_LIMIT;
    }

    return transfers;
  }

  private async fetchTransactionMemo(txHash: string): Promise<string> {
    if (!txHash) return '';

    const url = new URL('/api/v3/transactions', this.rpcUrl);
    url.searchParams.set('hash', txHash);
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), { headers: this.buildHeaders() });
    if (!response.ok) {
      throw new Error(`TON transaction memo request failed with ${response.status}`);
    }

    const payload = (await response.json()) as {
      transactions?: Array<{
        in_msg?: {
          message_content?: {
            decoded?: {
              forward_payload?: {
                value?: {
                  text?: string;
                };
                text?: string;
              };
            };
          };
        };
      }>;
    };

    const decoded = payload.transactions?.[0]?.in_msg?.message_content?.decoded;
    const memo = decoded?.forward_payload?.value?.text || decoded?.forward_payload?.text || '';
    return typeof memo === 'string' ? memo.trim() : '';
  }

  private async fetchCurrentMasterchainSeqno(): Promise<number> {
    const response = await fetch(new URL('/api/v2/getMasterchainInfo', this.rpcUrl).toString(), {
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`TON masterchain request failed with ${response.status}`);
    }

    const payload = (await response.json()) as { result?: { last?: { seqno?: number } } };
    return payload.result?.last?.seqno || 0;
  }

  private async fetchTransactionMcSeqno(txHash: string): Promise<number> {
    const url = new URL('/api/v3/transactions', this.rpcUrl);
    url.searchParams.set('hash', txHash);
    url.searchParams.set('limit', '1');

    const response = await fetch(url.toString(), { headers: this.buildHeaders() });
    if (!response.ok) {
      throw new Error(`TON transaction request failed with ${response.status}`);
    }

    const payload = (await response.json()) as { transactions?: TonTransaction[] };
    return payload.transactions?.[0]?.mc_block_seqno || 0;
  }

  private getEarliestCreatedAtUnix(deposits: Array<{ created_at?: Date | string | null }>): number {
    const createdAtValues = deposits
      .map((deposit) => deposit.created_at)
      .filter((value): value is Date | string => Boolean(value))
      .map((value) => {
        const date = value instanceof Date ? value : new Date(value);
        return Math.floor(date.getTime() / 1000);
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    if (createdAtValues.length === 0) {
      return Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    }

    return Math.max(Math.min(...createdAtValues) - 60 * 60, 0);
  }

  private buildHeaders(): Record<string, string> {
    if (!this.apiKey) {
      return {
        Accept: 'application/json',
        'User-Agent': 'Hotweeklytrader/1.0',
      };
    }

    return {
      Accept: 'application/json',
      'User-Agent': 'Hotweeklytrader/1.0',
      'X-API-Key': this.apiKey,
    };
  }

  private normalizeAddress(address: string): string {
    if (!address) return '';

    try {
      return Address.parse(address).toRawString().toLowerCase();
    } catch {
      return address.trim().toLowerCase();
    }
  }

  private formatTokenAmount(value: string): string {
    const rawValue = BigInt(value || '0');
    const base = 10n ** BigInt(TON_DECIMALS);
    const whole = rawValue / base;
    const fraction = rawValue % base;

    if (fraction === 0n) {
      return whole.toString();
    }

    const fractionText = fraction.toString().padStart(TON_DECIMALS, '0').replace(/0+$/, '');
    return `${whole.toString()}.${fractionText}`;
  }

  private async recordTransactionLog(tx: OnChainTransaction): Promise<void> {
    const existing = await this.prisma.transactionLog.findFirst({
      where: { tx_hash: tx.txHash, network: tx.network },
    });

    if (existing) {
      return;
    }

    await this.prisma.transactionLog.create({
      data: {
        direction: 'inbound',
        network: tx.network,
        asset_symbol: tx.tokenSymbol,
        tx_hash: tx.txHash,
        from_address: tx.fromAddress,
        to_address: tx.toAddress,
        amount: tx.amount,
        confirmations: tx.confirmations,
        status: tx.confirmations > 0 ? 'confirmed' : 'pending',
        raw_payload_reference: tx.rawPayload || null,
        source_system: 'blockchain-watcher',
      },
    });
  }

  private async processDetectedTransfer(tx: OnChainTransaction): Promise<void> {
    const candidateDeposits = await this.prisma.deposit.findMany({
      where: {
        network: tx.network,
        status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
        source_address: tx.network === 'TON' ? { not: null } : tx.fromAddress.toLowerCase(),
      },
    });
    const deposits =
      tx.network === 'TON'
        ? this.pickTonDepositsForTransaction(candidateDeposits, tx)
        : candidateDeposits;

    for (const deposit of deposits) {
      const confirmedAmount = parseFloat(tx.amount);
      let currentStatus = deposit.status;

      if (currentStatus === 'AWAITING_TRANSFER') {
        await this.depositsService.transition(deposit.deposit_id, 'DETECTED');
        await this.prisma.deposit.update({
          where: { deposit_id: deposit.deposit_id },
          data: {
            tx_hash: tx.txHash,
            source_address: tx.fromAddress,
            confirmed_amount: confirmedAmount.toString(),
            confirmation_count: tx.confirmations,
          },
        });

        const user = await this.prisma.user.findUnique({ where: { user_id: deposit.user_id } });
        if (user) {
          await this.notificationsService.send({
            user_id: user.user_id,
            type: 'TRANSFER_DETECTED',
            channel: 'TELEGRAM',
            title: 'Transfer Detected',
            body: `We detected a transfer of ${confirmedAmount} USDT on TON. Waiting for confirmations...`,
            related_entity_type: 'Deposit',
            related_entity_id: deposit.deposit_id,
          });
        }
        currentStatus = 'DETECTED';
      }

      if (tx.confirmations > 0 && currentStatus === 'DETECTED') {
        await this.depositsService.transition(deposit.deposit_id, 'CONFIRMING');
        await this.prisma.deposit.update({
          where: { deposit_id: deposit.deposit_id },
          data: {
            tx_hash: tx.txHash,
            source_address: tx.fromAddress,
            confirmed_amount: confirmedAmount.toString(),
            confirmation_count: tx.confirmations,
          },
        });
        currentStatus = 'CONFIRMING';
      }

      if (tx.confirmations >= this.confirmationsRequired && currentStatus === 'CONFIRMING') {
        await this.depositsService.transition(deposit.deposit_id, 'CONFIRMED');
        await this.prisma.deposit.update({
          where: { deposit_id: deposit.deposit_id },
          data: {
            tx_hash: tx.txHash,
            source_address: tx.fromAddress,
            confirmed_amount: confirmedAmount.toString(),
            confirmation_count: tx.confirmations,
          },
        });
        await this.depositsService.transition(deposit.deposit_id, 'ACTIVE');

        const user = await this.prisma.user.findUnique({ where: { user_id: deposit.user_id } });
        if (user) {
          await this.notificationsService.send({
            user_id: user.user_id,
            type: 'TRANSFER_CONFIRMED',
            channel: 'TELEGRAM',
            title: 'Deposit Confirmed',
            body: `Your deposit of ${confirmedAmount} USDT is confirmed and active!`,
            related_entity_type: 'Deposit',
            related_entity_id: deposit.deposit_id,
          });
        }
      }
    }
  }

  private pickTonDepositsForTransaction(candidateDeposits: any[], tx: OnChainTransaction): any[] {
    const matchingDeposit = this.matchTransferToDeposit(tx as OnChainTransaction & { memo?: string }, candidateDeposits);
    return matchingDeposit ? [matchingDeposit] : [];
  }

  private matchTransferToDeposit(
    tx: OnChainTransaction & { memo?: string },
    candidateDeposits: any[],
  ): any | null {
    const normalizedSourceAddress = this.normalizeAddress(tx.fromAddress);
    const normalizedMemo = (tx.memo || '').trim();
    const sourceMatches = candidateDeposits.filter(
      (deposit) => this.normalizeAddress(deposit.source_address || '') === normalizedSourceAddress,
    );

    if (normalizedMemo) {
      const memoMatches = sourceMatches.filter((deposit) => (deposit.ton_deposit_memo || '').trim() === normalizedMemo);
      if (memoMatches.length > 0) {
        return this.sortDepositsByRecency(memoMatches)[0];
      }

      const fallbackMemoMatches = candidateDeposits.filter(
        (deposit) => (deposit.ton_deposit_memo || '').trim() === normalizedMemo,
      );
      if (fallbackMemoMatches.length > 0) {
        return this.sortDepositsByRecency(fallbackMemoMatches)[0];
      }
    }

    if (sourceMatches.length <= 1) {
      return sourceMatches[0] || null;
    }

    const bySameTxHash = sourceMatches.filter((deposit) => deposit.tx_hash === tx.txHash);
    if (bySameTxHash.length > 0) {
      return this.sortDepositsByRecency(bySameTxHash)[0];
    }

    const awaitingTransfer = sourceMatches.filter((deposit) => deposit.status === 'AWAITING_TRANSFER');
    if (awaitingTransfer.length > 0) {
      return this.sortDepositsByRecency(awaitingTransfer)[0];
    }

    return this.sortDepositsByRecency(sourceMatches)[0] || null;
  }

  private sortDepositsByRecency(deposits: any[]): any[] {
    return [...deposits].sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
  }
}
