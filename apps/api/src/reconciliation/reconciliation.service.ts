import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private prisma: PrismaService) {}

  async findUnmatchedTransactions(network?: string): Promise<{
    unmatched: any[];
    total: number;
  }> {
    const where: any = {
      direction: 'inbound',
      status: 'pending',
    };
    if (network) where.network = network;

    const transactions = await this.prisma.transactionLog.findMany({ where });

    const depositRoutes = await this.prisma.deposit.findMany({
      where: { network: network || undefined },
      select: { deposit_route: true },
    });

    const routeSet = new Set(depositRoutes.map((d) => d.deposit_route));
    const unmatched = transactions.filter((tx) => !routeSet.has(tx.to_address));

    return { unmatched, total: unmatched.length };
  }

  async matchTransactionToDeposit(txHash: string, depositRoute: string): Promise<boolean> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_route: depositRoute },
    });

    if (!deposit) {
      this.logger.warn(`No deposit found for route ${depositRoute}`);
      return false;
    }

    const tx = await this.prisma.transactionLog.findFirst({
      where: { tx_hash: txHash },
    });

    if (!tx) {
      this.logger.warn(`No transaction log found for hash ${txHash}`);
      return false;
    }

    await this.prisma.transactionLog.update({
      where: { transaction_log_id: tx.transaction_log_id },
      data: { status: 'matched' },
    });

    this.logger.log(`Matched transaction ${txHash} to deposit ${deposit.deposit_id}`);
    return true;
  }

  async getReconciliationReport(fromDate?: Date, toDate?: Date): Promise<{
    totalInbound: number;
    matchedCount: number;
    unmatchedCount: number;
    totalAmount: string;
  }> {
    const where: any = { direction: 'inbound' };
    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) where.created_at.gte = fromDate;
      if (toDate) where.created_at.lte = toDate;
    }

    const [totalInbound, matchedCount, unmatchedCount] = await Promise.all([
      this.prisma.transactionLog.count({ where }),
      this.prisma.transactionLog.count({ where: { ...where, status: 'matched' } }),
      this.prisma.transactionLog.count({ where: { ...where, status: 'pending' } }),
    ]);

    return {
      totalInbound,
      matchedCount,
      unmatchedCount,
      totalAmount: '0',
    };
  }
}
