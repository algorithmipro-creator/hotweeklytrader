import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { DepositsService } from '../../deposits/deposits.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { BlockchainWatcher } from '../interfaces/watcher.interface';
import { OnChainTransaction } from '../interfaces/network.interface';

const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const TRON_POLL_LIMIT = 200;
const TRON_POLL_INTERVAL_MS = 30000;

type TronTransfer = {
  transaction_id: string;
  from: string;
  to: string;
  value: string;
  block_timestamp?: number;
  block_number?: number;
  token_info?: {
    address?: string;
    decimals?: number;
    symbol?: string;
  };
};

@Injectable()
export class TronUsdtWatcherService implements BlockchainWatcher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TronUsdtWatcherService.name);
  private readonly confirmationsRequired: number;
  private readonly depositAddress: string;
  private readonly rpcUrl: string;
  private running = false;
  private pollInFlight = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastSeenTimestamp = 0;

  constructor(
    private prisma: PrismaService,
    private depositsService: DepositsService,
    private notificationsService: NotificationsService,
    private configService: ConfigService,
  ) {
    this.confirmationsRequired = this.configService.get<number>('blockchain.tron.confirmationsRequired') || 19;
    this.depositAddress = this.configService.get<string>('blockchain.tron.depositAddress') || '';
    this.rpcUrl = this.configService.get<string>('blockchain.tron.rpcUrl') || 'https://api.trongrid.io';
  }

  async onModuleInit() {
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  getNetworkName(): string {
    return 'TRON';
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (!this.depositAddress) {
      this.logger.warn('BLOCKCHAIN_TRON_DEPOSIT_ADDRESS not configured, watcher disabled');
      return;
    }

    this.running = true;
    this.logger.log(`Starting TRON USDT watcher for ${this.depositAddress}`);

    this.intervalId = setInterval(() => {
      this.poll().catch((error) => {
        this.logger.error(`TRON poll error: ${error.message}`);
      });
    }, TRON_POLL_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async getLatestBlock(): Promise<number> {
    return this.getCurrentBlockNumber();
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
          network: 'TRON',
          status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
          source_address: { not: null },
        },
      });

      if (deposits.length === 0) return;

      const trackedAddresses = new Set(
        deposits
          .map((deposit) => deposit.source_address?.toLowerCase())
          .filter((address): address is string => Boolean(address)),
      );

      if (trackedAddresses.size === 0) return;

      const currentBlock = await this.getCurrentBlockNumber();
      const transfers = await this.fetchRecentUsdtTransfers();
      let newestTimestamp = this.lastSeenTimestamp;

      for (const transfer of transfers) {
        const txTimestamp = transfer.block_timestamp || 0;
        newestTimestamp = Math.max(newestTimestamp, txTimestamp);

        if (txTimestamp > 0 && this.lastSeenTimestamp > 0 && txTimestamp <= this.lastSeenTimestamp) {
          continue;
        }

        const fromAddress = (transfer.from || '').toLowerCase();
        if (!trackedAddresses.has(fromAddress)) continue;

        const blockNumber = transfer.block_number || 0;
        const confirmations = blockNumber > 0 ? Math.max(currentBlock - blockNumber, 0) : 0;
        const decimals = transfer.token_info?.decimals ?? 6;

        await this.processDetectedTransfer({
          txHash: transfer.transaction_id,
          blockNumber,
          fromAddress,
          toAddress: this.depositAddress,
          amount: this.formatTokenAmount(transfer.value, decimals),
          tokenSymbol: transfer.token_info?.symbol || 'USDT',
          confirmations,
          timestamp: new Date(txTimestamp || Date.now()),
          network: 'TRON',
          rawPayload: JSON.stringify(transfer),
        });
      }

      this.lastSeenTimestamp = newestTimestamp;
    } finally {
      this.pollInFlight = false;
    }
  }

  private async fetchRecentUsdtTransfers(): Promise<TronTransfer[]> {
    const url = new URL(`${this.rpcUrl.replace(/\/$/, '')}/v1/accounts/${this.depositAddress}/transactions/trc20`);
    url.searchParams.set('only_to', 'true');
    url.searchParams.set('limit', String(TRON_POLL_LIMIT));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`TronGrid returned ${response.status}`);
    }

    const payload = await response.json() as { data?: TronTransfer[] };
    const transfers = payload.data || [];

    return transfers.filter((transfer) => {
      const contract = transfer.token_info?.address || '';
      return contract === TRON_USDT_CONTRACT && (transfer.to || '').toLowerCase() === this.depositAddress.toLowerCase();
    });
  }

  private async getCurrentBlockNumber(): Promise<number> {
    const response = await fetch(`${this.rpcUrl.replace(/\/$/, '')}/wallet/getnowblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`TRON block request failed with ${response.status}`);
    }

    const payload = await response.json() as { block_header?: { raw_data?: { number?: number } } };
    return payload.block_header?.raw_data?.number || 0;
  }

  private formatTokenAmount(value: string, decimals: number): string {
    const rawValue = BigInt(value || '0');
    const base = 10n ** BigInt(decimals);
    const whole = rawValue / base;
    const fraction = rawValue % base;

    if (fraction === 0n) {
      return whole.toString();
    }

    const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${whole.toString()}.${fractionText}`;
  }

  private async processDetectedTransfer(tx: OnChainTransaction): Promise<void> {
    const deposits = await this.prisma.deposit.findMany({
      where: {
        network: tx.network,
        status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
        source_address: tx.fromAddress.toLowerCase(),
      },
    });

    for (const deposit of deposits) {
      const confirmedAmount = parseFloat(tx.amount);

      if (deposit.status === 'AWAITING_TRANSFER') {
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
            body: `We detected a transfer of ${confirmedAmount} USDT on TRON. Waiting for confirmations...`,
            related_entity_type: 'Deposit',
            related_entity_id: deposit.deposit_id,
          });
        }
      } else if (tx.confirmations >= this.confirmationsRequired && deposit.status === 'CONFIRMING') {
        await this.depositsService.transition(deposit.deposit_id, 'CONFIRMED');
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
      } else if (deposit.status === 'DETECTED' && tx.confirmations > 0) {
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
      }
    }
  }
}
