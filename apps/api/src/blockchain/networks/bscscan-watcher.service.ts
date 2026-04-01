import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainWatcher } from '../interfaces/watcher.interface';
import { OnChainTransaction } from '../interfaces/network.interface';
import { DepositsService } from '../../deposits/deposits.service';
import { NotificationsService } from '../../notifications/notifications.service';

const USDT_BSC_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';

@Injectable()
export class BscScanWatcherService implements BlockchainWatcher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BscScanWatcherService.name);
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastProcessedBlock = 0;
  private depositAddress = '';
  private apiKey = '';
  private readonly baseUrl = 'https://api.bscscan.com/api';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private depositsService: DepositsService,
    private notificationsService: NotificationsService,
  ) {
    this.depositAddress = process.env.BLOCKCHAIN_BSC_DEPOSIT_ADDRESS || '';
    this.apiKey = process.env.BLOCKCHAIN_BSCSCAN_API_KEY || this.configService.get<string>('blockchain.bsc.scanApiKey') || '';
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

    if (!this.apiKey) {
      this.logger.warn('BSCSCAN_API_KEY not configured, watcher disabled');
      return;
    }

    this.running = true;
    this.logger.log('Starting BSC watcher via BscScan API...');

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
    const url = `${this.baseUrl}?module=proxy&action=eth_blockNumber&apikey=${this.apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return parseInt(data.result, 16);
  }

  async checkTransaction(txHash: string): Promise<OnChainTransaction | null> {
    return null;
  }

  private async poll(): Promise<void> {
    if (!this.apiKey || !this.depositAddress) return;

    try {
      const currentBlock = await this.getLatestBlock();
      this.logger.debug(`Poll: currentBlock=${currentBlock}, lastProcessed=${this.lastProcessedBlock}`);

      if (currentBlock <= this.lastProcessedBlock) {
        this.logger.debug('No new blocks, skipping');
        return;
      }

      const fromBlock = this.lastProcessedBlock > 0 ? this.lastProcessedBlock + 1 : Math.max(0, currentBlock - 5);
      const toBlock = currentBlock;

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

      const url = `${this.baseUrl}?module=account&action=tokentx&contractaddress=${USDT_BSC_CONTRACT}&address=${this.depositAddress}&startblock=${fromBlock}&endblock=${toBlock}&sort=asc&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== '1' || !data.result) {
        if (data.message === 'No transactions found') {
          this.logger.debug(`No USDT transfers in blocks ${fromBlock}-${toBlock}`);
        } else {
          this.logger.warn(`BscScan API: ${data.message}`);
        }
        this.lastProcessedBlock = currentBlock;
        return;
      }

      const transfers = data.result;
      this.logger.log(`Found ${transfers.length} USDT transfer(s) in blocks ${fromBlock}-${toBlock}`);

      for (const tx of transfers) {
        const from = (tx.from || '').toLowerCase();
        const to = (tx.to || '').toLowerCase();
        const amount = parseFloat(tx.value) / Math.pow(10, parseInt(tx.tokenDecimal || '18'));
        const confirmations = parseInt(tx.confirmations || '0');

        if (to !== toAddress) continue;
        if (!sourceAddresses.includes(from)) {
          this.logger.debug(`Transfer from ${from} not matched to any deposit`);
          continue;
        }

        this.logger.log(
          `Matched USDT transfer: ${amount} USDT from ${from} (TX: ${tx.hash.slice(0, 10)}..., confirmations: ${confirmations})`,
        );

        await this.processDetectedTransfer({
          txHash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          fromAddress: tx.from,
          toAddress: tx.to,
          amount: amount.toString(),
          tokenSymbol: 'USDT',
          confirmations,
          timestamp: new Date(parseInt(tx.timeStamp) * 1000),
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
