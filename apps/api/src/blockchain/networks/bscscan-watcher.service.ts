import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainWatcher } from '../interfaces/watcher.interface';
import { OnChainTransaction } from '../interfaces/network.interface';
import { DepositsService } from '../../deposits/deposits.service';
import { NotificationsService } from '../../notifications/notifications.service';

const USDT_BSC_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
const USDT_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const RPC_URL = 'https://bsc.blockpi.network/v1/rpc/public';

@Injectable()
export class BscScanWatcherService implements BlockchainWatcher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BscScanWatcherService.name);
  private running = false;
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
    this.logger.log('Starting BSC watcher via Ankr RPC...');

    try {
      this.lastProcessedBlock = await this.getLatestBlock();
      this.logger.log(`Starting from block ${this.lastProcessedBlock}`);
    } catch (err: any) {
      this.logger.error(`Failed to get latest block: ${err.message}`);
      this.lastProcessedBlock = 0;
    }

    this.intervalId = setInterval(() => {
      this.poll().catch((err) => {
        this.logger.error(`Poll error:`, err);
      });
    }, 30000);
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
    const res = await fetch(RPC_URL, {
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
    if (!this.depositAddress) return;

    try {
      const currentBlock = await this.getLatestBlock();
      this.logger.debug(`Poll: currentBlock=${currentBlock}, lastProcessed=${this.lastProcessedBlock}`);

      if (currentBlock <= this.lastProcessedBlock) {
        this.logger.debug('No new blocks, skipping');
        return;
      }

      const fromBlock = this.lastProcessedBlock > 0 ? this.lastProcessedBlock + 1 : Math.max(0, currentBlock - 1);
      const toBlock = fromBlock;

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

      const sourceAddresses = deposits.map((d) => d.source_address?.toLowerCase()).filter(Boolean);
      const toAddress = this.depositAddress.toLowerCase();

      // Get USDT Transfer events to our deposit address
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [{
            address: USDT_BSC_CONTRACT,
            fromBlock: '0x' + fromBlock.toString(16),
            toBlock: '0x' + toBlock.toString(16),
            topics: [
              USDT_TRANSFER_TOPIC,
              null, // any from
              '0x000000000000000000000000' + toAddress.slice(2), // to = our address
            ],
          }],
          id: 1,
        }),
      });

      const data = await res.json();

      if (data.error) {
        this.logger.error(`eth_getLogs error: ${data.error.message}`);
        this.lastProcessedBlock = currentBlock;
        return;
      }

      const logs = data.result || [];
      this.logger.debug(`Found ${logs.length} USDT transfer log(s) in blocks ${fromBlock}-${toBlock}`);

      for (const log of logs) {
        const from = '0x' + log.topics[1].slice(26).toLowerCase();
        const amountHex = log.data;
        const amount = parseInt(amountHex, 16) / 1e18;
        const txHash = log.transactionHash;
        const blockNumber = parseInt(log.blockNumber, 16);

        if (!sourceAddresses.includes(from)) {
          this.logger.debug(`Transfer from ${from} not matched to any deposit`);
          continue;
        }

        // Get confirmations
        const confirmations = currentBlock - blockNumber;

        this.logger.log(
          `Matched USDT transfer: ${amount} USDT from ${from} (TX: ${txHash.slice(0, 10)}..., confirmations: ${confirmations})`,
        );

        await this.processDetectedTransfer({
          txHash,
          blockNumber,
          fromAddress: from,
          toAddress: this.depositAddress,
          amount: amount.toString(),
          tokenSymbol: 'USDT',
          confirmations,
          timestamp: new Date(),
          network: 'BSC',
        });
      }

      this.lastProcessedBlock = currentBlock;
    } catch (error: any) {
      this.logger.error(`Poll failed: ${error.message}`);
    }
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
