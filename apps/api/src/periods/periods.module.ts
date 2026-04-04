import { Module } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodsController } from './periods.controller';
import { AdminPeriodsController } from './admin-periods.controller';
import { PeriodAnalyticsService } from './period-analytics.service';

@Module({
  providers: [PeriodsService, PeriodAnalyticsService],
  controllers: [PeriodsController, AdminPeriodsController],
  exports: [PeriodsService],
})
export class PeriodsModule {}
