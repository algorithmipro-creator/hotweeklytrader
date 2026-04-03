import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PeriodTransitionGuard } from '../../periods/period-transition.guard';

@Injectable()
export class PeriodCompletionJob {
  private readonly logger = new Logger(PeriodCompletionJob.name);

  constructor(private prisma: PrismaService) {}

  async execute(periodId: string): Promise<void> {
    const period = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: periodId },
    });

    if (!period) {
      this.logger.warn(`Period ${periodId} not found for completion`);
      return;
    }

    if (period.end_date > new Date()) {
      this.logger.debug(`Period ${periodId} has not ended yet`);
      return;
    }

    if (period.status !== 'TRADING_ACTIVE') {
      this.logger.debug(`Period ${periodId} is not in TRADING_ACTIVE state`);
      return;
    }

    PeriodTransitionGuard.assertCanTransition(period.status, 'REPORTING');

    await this.prisma.investmentPeriod.update({
      where: { investment_period_id: periodId },
      data: { status: 'REPORTING' },
    });

    this.logger.log(`Period ${periodId} marked as reporting`);
  }
}
