import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainWatcher } from '../interfaces/watcher.interface';
import { OnChainTransaction } from '../interfaces/network.interface';
import { DepositsService } from '../../deposits/deposits.service';
import { NotificationsService } from '../../notifications/notifications.service';

const USDT_BSC_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
const TATUM_URL = 'https://bsc-mainnet.gateway.tatum.io';
const TATUM_API_KEY = process.env.TATUM_API_KEY || '';
const FALLBACK_RPC_URL = 'https://bsc-dataseed.binance.org';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const TATUM_CHUNK_SIZE = 500;
const POLL_INTERVAL_MS = 30000;
const INITIAL_BACKFILL_BLOCKS = 1800;
const TOKEN_DECIMALS = 18n;

@Injectable()
export class BscScanWatcherService implements BlockchainWatcher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BscScanWatcherService.name);
  private running = false;
  private pollInFlight = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastProcessedBlock = 0;
  private depositAddress = '';

  constructor(
    private prisma: PrismaService,
    private depositsService: DepositsService,
    private notificationsService: NotificationsService,
  ) {
    this.depositAddress = process.env.BLOCKCHAIN_BSC_DEPOSIT_ADDRESS || '';
  }

  async onModuleInit() {
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  getNetworkName(): string {
    return 'BSC';
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (!this.depositAddress) {
      this.logger.warn('BLOCKCHAIN_BSC_DEPOSIT_ADDRESS not configured, watcher disabled');
      return;
    }

    this.running = true;
    this.logger.log('Starting BSC watcher via Tatum API...');

    try {
      const latestBlock = await this.getLatestBlock();
      this.lastProcessedBlock = Math.max(latestBlock - INITIAL_BACKFILL_BLOCKS, 0);
      this.logger.log(
        `Starting BSC watcher with Tatum API, latest block: ${latestBlock}, initial scan from: ${this.lastProcessedBlock}`,
      );
    } catch (err: any) {
      this.logger.error(`Failed to get latest block: ${err.message}`);
      this.lastProcessedBlock = 0;
    }

    this.intervalId = setInterval(() => {
      this.poll().catch((err) => {
        this.logger.error(`Poll error:`, err);
      });
    }, POLL_INTERVAL_MS);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.log('BSC watcher stopped');
  }

  async getLatestBlock(): Promise<number> {
    const res = await fetch(FALLBACK_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return parseInt(data.result, 16);
  }

  async checkTransaction(txHash: string): Promise<OnChainTransaction | null> {
    return null;
  }

  private async poll(): Promise<void> {
    if (!this.depositAddress || this.pollInFlight) return;
    this.pollInFlight = true;

    try {
      const currentBlock = await this.getLatestBlock();

      // Get deposits that need scanning
      const deposits = await this.prisma.deposit.findMany({
        where: {
          network: 'BSC',
          status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
          source_address: { not: null },
        },
      });

      if (deposits.length === 0) {
        this.lastProcessedBlock = currentBlock;
        return;
      }

      const trackedAddresses = new Set(
        deposits
          .map((deposit) => deposit.source_address?.toLowerCase())
          .filter((address): address is string => Boolean(address)),
      );

      if (trackedAddresses.size === 0) {
        this.lastProcessedBlock = currentBlock;
        return;
      }

      const scanFromBlock =
        this.lastProcessedBlock > 0
          ? Math.min(this.lastProcessedBlock + 1, currentBlock)
          : Math.max(currentBlock - INITIAL_BACKFILL_BLOCKS, 0);

      if (scanFromBlock > currentBlock) {
        this.lastProcessedBlock = currentBlock;
        return;
      }

      const transfers = await this.getTokenTransfers(scanFromBlock, currentBlock, this.depositAddress);
      this.logger.debug(
        `Found ${transfers.length} token transfer(s) to ${this.depositAddress} between blocks ${scanFromBlock} and ${currentBlock}`,
      );

      for (const transfer of transfers) {
        const sourceAddress = transfer.from.toLowerCase();
        if (!trackedAddresses.has(sourceAddress)) continue;

        const transferBlock = parseInt(transfer.blockNumber, 10);
        const confirmations = currentBlock - transferBlock;
        const amount = this.formatTokenAmount(transfer.value, TOKEN_DECIMALS);

        this.logger.log(
          `Matched USDT transfer: ${amount} USDT from ${transfer.from} (TX: ${transfer.hash?.slice(0, 10)}..., confirmations: ${confirmations})`,
        );

        await this.processDetectedTransfer({
          txHash: transfer.hash,
          blockNumber: transferBlock,
          fromAddress: transfer.from,
          toAddress: this.depositAddress,
          amount,
          tokenSymbol: 'USDT',
          confirmations,
          timestamp: new Date(),
          network: 'BSC',
          rawPayload: JSON.stringify(transfer),
        });
      }

      this.lastProcessedBlock = currentBlock;
    } catch (error: any) {
      this.logger.error(`Poll failed: ${error.message}`);
    } finally {
      this.pollInFlight = false;
    }
  }

  private async getTokenTransfers(fromBlock: number, toBlock: number, depositAddress: string): Promise<any[]> {
    if (!TATUM_API_KEY) {
      this.logger.warn('TATUM_API_KEY not configured, cannot fetch token transfers');
      return [];
    }

    const allTransfers: any[] = [];

    for (let chunkStart = fromBlock; chunkStart <= toBlock; chunkStart += TATUM_CHUNK_SIZE) {
      const chunkEnd = Math.min(chunkStart + TATUM_CHUNK_SIZE - 1, toBlock);
      const fromBlockHex = '0x' + chunkStart.toString(16);
      const toBlockHex = '0x' + chunkEnd.toString(16);
      const targetTopic = this.getDepositTopic(depositAddress);

      this.logger.debug(`Scanning BSC blocks ${fromBlockHex} to ${toBlockHex}`);

      await new Promise((r) => setTimeout(r, 500));

      const postData = JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: fromBlockHex,
          toBlock: toBlockHex,
          address: USDT_BSC_CONTRACT,
          topics: [
            TRANSFER_TOPIC,
            null,
            targetTopic,
          ]
        }],
        id: 1
      });

      const response = await fetch(TATUM_URL + '/', {
        method: 'POST',
        headers: { 
          'x-api-key': TATUM_API_KEY,
          'Content-Type': 'application/json',
          'Content-Length': String(Buffer.byteLength(postData))
        },
        body: postData
      });
      
      if (!response.ok) {
        this.logger.error(`Tatum RPC error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.error) {
        this.logger.error(`Tatum JSON-RPC error: ${data.error.message} (code: ${data.error.code})`);
        continue;
      }
      
      const logs = data.result || [];
      this.logger.debug(`Tatum returned ${logs.length} logs for blocks ${fromBlockHex}-${toBlockHex}`);

      if (logs.length > 0) {
        this.logger.log(`Found ${logs.length} transfers to deposit address in blocks ${fromBlockHex}-${toBlockHex}`);
      }

      allTransfers.push(...logs);
    }

    return allTransfers.map((log: any) => ({
      hash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16).toString(),
      from: '0x' + log.topics[1].slice(26),
      to: depositAddress,
      value: log.data,
      timeStamp: '0',
    }));
  }

  private getDepositTopic(depositAddress: string): string {
    return `0x000000000000000000000000${depositAddress.toLowerCase().replace(/^0x/, '')}`;
  }

  private formatTokenAmount(value: string, decimals: bigint): string {
    const rawValue = BigInt(value);
    const base = 10n ** decimals;
    const whole = rawValue / base;
    const fraction = rawValue % base;

    if (fraction === 0n) {
      return whole.toString();
    }

    const fractionText = fraction.toString().padStart(Number(decimals), '0').replace(/0+$/, '');
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
        this.logger.log(`Deposit ${deposit.deposit_id} detected: ${confirmedAmount} USDT`);

        const user = await this.prisma.user.findUnique({ where: { user_id: deposit.user_id } });
        if (user) {
          await this.notificationsService.send({
            user_id: user.user_id,
            type: 'TRANSFER_DETECTED',
            channel: 'TELEGRAM',
            title: 'Transfer Detected',
            body: `We detected a transfer of ${confirmedAmount} USDT on BSC. Waiting for confirmations...`,
            related_entity_type: 'Deposit',
            related_entity_id: deposit.deposit_id,
          });
        }
      } else if (tx.confirmations >= 12 && deposit.status === 'CONFIRMING') {
        await this.depositsService.transition(deposit.deposit_id, 'CONFIRMED');
        await this.depositsService.transition(deposit.deposit_id, 'ACTIVE');
        this.logger.log(`Deposit ${deposit.deposit_id} confirmed and activated`);

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
