import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PeriodAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(periodId: string) {
    const aggregate = await this.prisma.deposit.aggregate({
      where: {
        investment_period_id: periodId,
        status: { not: 'CANCELLED' },
      },
      _count: {
        deposit_id: true,
        confirmed_amount: true,
      },
      _sum: { confirmed_amount: true },
    });

    const depositCount = aggregate._count.deposit_id || 0;
    const confirmedDepositCount = aggregate._count.confirmed_amount || 0;
    const totalDepositedUsdt = this.toNumber(aggregate._sum.confirmed_amount);
    const averageDepositUsdt = confirmedDepositCount === 0
      ? 0
      : totalDepositedUsdt / confirmedDepositCount;

    return {
      depositCount,
      totalDepositedUsdt,
      averageDepositUsdt,
    };
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }
}
