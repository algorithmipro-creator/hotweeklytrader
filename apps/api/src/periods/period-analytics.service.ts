import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export const COUNTABLE_CONFIRMED_USDT_STATUSES = [
  'CONFIRMED',
  'ACTIVE',
  'COMPLETED',
  'REPORT_READY',
  'PAYOUT_PENDING',
  'PAYOUT_APPROVED',
  'PAYOUT_SENT',
  'PAYOUT_CONFIRMED',
  'ON_HOLD',
  'MANUAL_REVIEW',
] as const;

@Injectable()
export class PeriodAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(periodId: string) {
    const summaries = await this.getSummaries([periodId]);
    return summaries[periodId] || {
      depositCount: 0,
      totalDepositedUsdt: 0,
      averageDepositUsdt: 0,
    };
  }

  async getSummaries(periodIds: string[]) {
    if (periodIds.length === 0) return {};

    const aggregates = await this.prisma.deposit.groupBy({
      by: ['investment_period_id'],
      where: {
        investment_period_id: { in: periodIds },
        asset_symbol: 'USDT',
        confirmed_amount: { not: null },
        confirmed_at: { not: null },
        status: { in: [...COUNTABLE_CONFIRMED_USDT_STATUSES] },
      },
      _count: {
        deposit_id: true,
      },
      _sum: {
        confirmed_amount: true,
      },
    });

    const summaries: Record<string, { depositCount: number; totalDepositedUsdt: number; averageDepositUsdt: number }> = {};
    for (const periodId of periodIds) {
      summaries[periodId] = {
        depositCount: 0,
        totalDepositedUsdt: 0,
        averageDepositUsdt: 0,
      };
    }

    for (const aggregate of aggregates as any[]) {
      const depositCount = aggregate._count.deposit_id || 0;
      const totalDepositedUsdt = this.toNumber(aggregate._sum.confirmed_amount);
      summaries[aggregate.investment_period_id] = {
        depositCount,
        totalDepositedUsdt,
        averageDepositUsdt: depositCount === 0 ? 0 : totalDepositedUsdt / depositCount,
      };
    }

    return summaries;
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }
}
