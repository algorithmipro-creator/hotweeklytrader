import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EvmWatcherService } from './networks/evm-watcher.service';
import { BlockchainWatcher } from './interfaces/watcher.interface';
import { OnChainTransaction } from './interfaces/network.interface';
import { DepositsService } from '../deposits/deposits.service';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly watchers: Map<string, BlockchainWatcher> = new Map();

  constructor(
    private prisma: PrismaService,
    private evmWatcher: EvmWatcherService,
    private depositsService: DepositsService,
  ) {
    this.watchers.set('BSC', this.evmWatcher);
    this.watchers.set('ETH', this.evmWatcher);
  }

  getWatcherForNetwork(network: string): BlockchainWatcher | undefined {
    return this.watchers.get(network);
  }

  getAllWatchers(): Map<string, BlockchainWatcher> {
    return this.watchers;
  }

  async getWatcherHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    for (const [name, watcher] of this.watchers) {
      health[name] = watcher.isRunning();
    }
    return health;
  }

  async recordTransaction(tx: OnChainTransaction): Promise<void> {
    const existing = await this.prisma.transactionLog.findFirst({
      where: { tx_hash: tx.txHash, network: tx.network },
    });

    if (existing) {
      this.logger.debug(`Transaction ${tx.txHash} already recorded`);
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
        source_system: 'blockchain-watcher',
      },
    });

    this.logger.log(`Recorded transaction ${tx.txHash} on ${tx.network}`);
  }

  async processDetectedTransaction(
    depositId: string,
    tx: OnChainTransaction,
    requiredConfirmations: number,
  ): Promise<void> {
    const deposit = await this.depositsService.findOneByRoute(tx.toAddress);
    if (!deposit || deposit.deposit_id !== depositId) return;

    const currentStatus = deposit.status;

    if (currentStatus === 'AWAITING_TRANSFER') {
      await this.depositsService.transition(depositId, 'DETECTED');
      await this.updateDepositWithTx(depositId, tx);
    }

    if (tx.confirmations >= requiredConfirmations && currentStatus === 'CONFIRMING') {
      await this.depositsService.transition(depositId, 'CONFIRMED');
      await this.depositsService.transition(depositId, 'ACTIVE');
    }

    if (currentStatus === 'DETECTED' && tx.confirmations > 0) {
      await this.depositsService.transition(depositId, 'CONFIRMING');
    }
  }

  private async updateDepositWithTx(depositId: string, tx: OnChainTransaction): Promise<void> {
    await (this.depositsService as any).prisma.deposit.update({
      where: { deposit_id: depositId },
      data: {
        tx_hash: tx.txHash,
        source_address: tx.fromAddress,
        confirmed_amount: tx.amount,
        confirmation_count: tx.confirmations,
      },
    });
  }
}
