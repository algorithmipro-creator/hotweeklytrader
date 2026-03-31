import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NetworkConfig, OnChainTransaction } from '../interfaces/network.interface';
import { BlockchainWatcher } from '../interfaces/watcher.interface';

@Injectable()
export class EvmWatcherService implements BlockchainWatcher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EvmWatcherService.name);
  private readonly network: NetworkConfig;
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastProcessedBlock = 0;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.network = {
      name: 'BSC',
      chainId: 56,
      rpcUrl: this.configService.get<string>('blockchain.bsc.rpcUrl') || 'https://bsc-dataseed.binance.org',
      nativeCurrency: 'BNB',
      supportedTokens: ['USDT', 'USDC', 'BUSD'],
      confirmationsRequired: this.configService.get<number>('blockchain.bsc.confirmationsRequired') || 12,
      pollingIntervalMs: 10000,
      blockConfirmations: 12,
    };
  }

  async onModuleInit() {
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  getNetworkName(): string {
    return this.network.name;
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.logger.log(`Starting ${this.network.name} blockchain watcher...`);

    try {
      this.lastProcessedBlock = await this.getLatestBlock();
    } catch {
      this.lastProcessedBlock = 0;
    }

    this.intervalId = setInterval(() => {
      this.poll().catch((err) => {
        this.logger.error(`Poll error on ${this.network.name}:`, err);
      });
    }, this.network.pollingIntervalMs);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.logger.log(`${this.network.name} watcher stopped`);
  }

  async getLatestBlock(): Promise<number> {
    return 0;
  }

  async checkTransaction(txHash: string): Promise<OnChainTransaction | null> {
    return null;
  }

  private async poll(): Promise<void> {
    try {
      const currentBlock = await this.getLatestBlock();
      if (currentBlock <= this.lastProcessedBlock) return;

      const deposits = await this.prisma.deposit.findMany({
        where: {
          network: this.network.name,
          status: {
            in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'],
          },
          route_expires_at: { gt: new Date() },
        },
      });

      for (const deposit of deposits) {
        await this.checkDeposit(deposit);
      }

      this.lastProcessedBlock = currentBlock;
    } catch (error) {
      this.logger.error(`Poll failed for ${this.network.name}:`, error);
    }
  }

  private async checkDeposit(deposit: any): Promise<void> {
    this.logger.debug(`Checking deposit ${deposit.deposit_id} on ${this.network.name}`);
  }
}
