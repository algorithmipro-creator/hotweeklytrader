import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NetworkConfig, OnChainTransaction } from '../interfaces/network.interface';
import { BlockchainWatcher } from '../interfaces/watcher.interface';
import { DepositsService } from '../../deposits/deposits.service';
import { NotificationsService } from '../../notifications/notifications.service';

const USDT_BSC_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
const USDT_BSC_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
];

@Injectable()
export class EvmWatcherService implements BlockchainWatcher, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EvmWatcherService.name);
  private readonly network: NetworkConfig;
  private running = false;
  private intervalId: NodeJS.Timeout | null = null;
  private lastProcessedBlock = 0;
  private ethers: any = null;
  private provider: any = null;
  private usdtContract: any = null;
  private depositAddress: string = '';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private depositsService: DepositsService,
    private notificationsService: NotificationsService,
  ) {
    this.network = {
      name: 'BSC',
      chainId: 56,
      rpcUrl: this.configService.get<string>('blockchain.bsc.rpcUrl') || 'https://bsc-dataseed.binance.org',
      nativeCurrency: 'BNB',
      supportedTokens: ['USDT', 'USDC', 'BUSD'],
      confirmationsRequired: this.configService.get<number>('blockchain.bsc.confirmationsRequired') || 12,
      pollingIntervalMs: 60000,
      blockConfirmations: 12,
    };

    this.depositAddress = process.env.BLOCKCHAIN_BSC_DEPOSIT_ADDRESS || '';
  }

  async onModuleInit() {
    await this.initEthers();
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  private async initEthers(): Promise<void> {
    try {
      const { ethers } = await import('ethers');
      this.ethers = ethers;
      this.provider = new ethers.JsonRpcProvider(this.network.rpcUrl);
      this.usdtContract = new ethers.Contract(USDT_BSC_CONTRACT, USDT_BSC_ABI, this.provider);
      this.logger.log(`Ethers.js initialized for ${this.network.name}`);
    } catch (error: any) {
      this.logger.error(`Failed to initialize ethers for ${this.network.name}: ${error.message}`);
    }
  }

  getNetworkName(): string {
    return this.network.name;
  }

  isRunning(): boolean {
    return this.running;
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (!this.provider) {
      this.logger.warn(`Cannot start ${this.network.name} watcher - ethers not initialized`);
      return;
    }

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
    if (!this.provider) return 0;
    return await this.provider.getBlockNumber();
  }

  async checkTransaction(txHash: string): Promise<OnChainTransaction | null> {
    if (!this.provider) return null;
    try {
      const tx = await this.provider.getTransaction(txHash);
      if (!tx) return null;
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return {
        txHash: tx.hash,
        blockNumber: tx.blockNumber || 0,
        fromAddress: tx.from,
        toAddress: tx.to || '',
        amount: tx.value.toString(),
        tokenSymbol: 'BNB',
        confirmations: receipt?.confirmations || 0,
        timestamp: new Date(),
        network: this.network.name,
      };
    } catch {
      return null;
    }
  }

  private async poll(): Promise<void> {
    if (!this.provider || !this.usdtContract) return;

    try {
      const currentBlock = await this.getLatestBlock();
      if (currentBlock <= this.lastProcessedBlock) return;

      const fromBlock = this.lastProcessedBlock > 0 ? this.lastProcessedBlock + 1 : Math.max(0, currentBlock - 10);
      const toBlock = Math.min(fromBlock + 10, currentBlock);

      if (!this.depositAddress) {
        this.logger.warn('No deposit address configured for BSC');
        this.lastProcessedBlock = currentBlock;
        return;
      }

      const toAddress = this.depositAddress.toLowerCase();

      const deposits = await this.prisma.deposit.findMany({
        where: {
          network: this.network.name,
          status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
          source_address: { not: null },
        },
      });

      if (deposits.length === 0) {
        this.lastProcessedBlock = currentBlock;
        return;
      }

      const sourceAddresses = deposits
        .map((d) => d.source_address?.toLowerCase())
        .filter(Boolean);

      const filter = this.usdtContract.filters.Transfer(null, this.depositAddress);
      const events = await this.usdtContract.queryFilter(filter, fromBlock, toBlock);

      for (const event of events) {
        const args = (event as any).args;
        const to = (args?.to || '').toLowerCase();
        const from = (args?.from || '').toLowerCase();

        if (to !== toAddress) continue;
        if (!sourceAddresses.includes(from)) continue;

        const value = args?.value;
        if (!value) continue;

        const decimals = 18;
        const amount = parseFloat(this.ethers.formatUnits(value, decimals));

        const txHash = (event as any).transactionHash;
        const blockNumber = (event as any).blockNumber;

        const block = await this.provider.getBlock(blockNumber);
        const timestamp = block ? new Date(Number(block.timestamp) * 1000) : new Date();

        const receipt = await this.provider.getTransactionReceipt(txHash);
        const confirmations = receipt?.confirmations || 0;

        this.logger.log(
          `Matched USDT transfer: ${amount} USDT from ${from} to ${toAddress} (TX: ${txHash.slice(0, 10)}...)`,
        );

        const tx: OnChainTransaction = {
          txHash,
          blockNumber,
          fromAddress: from,
          toAddress: to,
          amount: amount.toString(),
          tokenSymbol: 'USDT',
          confirmations,
          timestamp,
          network: this.network.name,
        };

        await this.processDetectedTransfer(tx);
      }

      this.lastProcessedBlock = currentBlock;
    } catch (error: any) {
      this.logger.error(`Poll failed for ${this.network.name}: ${error.message}`);
    }
  }

  private async processDetectedTransfer(tx: OnChainTransaction): Promise<void> {
    const deposits = await this.prisma.deposit.findMany({
      where: {
        network: tx.network,
        status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
        route_expires_at: { gt: new Date() },
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
            body: `We detected a transfer of ${confirmedAmount} USDT on ${tx.network}. Waiting for confirmations...`,
            related_entity_type: 'Deposit',
            related_entity_id: deposit.deposit_id,
          });
        }
      } else if (tx.confirmations >= this.network.confirmationsRequired && deposit.status === 'CONFIRMING') {
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
