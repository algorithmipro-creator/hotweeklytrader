import { Module } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodsController } from './periods.controller';
import { AdminPeriodsController } from './admin-periods.controller';
import { PeriodAnalyticsService } from './period-analytics.service';
import { PeriodSettlementService } from './period-settlement.service';
import { PeriodPayoutRegistryService } from './period-payout-registry.service';

@Module({
  providers: [PeriodsService, PeriodAnalyticsService, PeriodSettlementService, PeriodPayoutRegistryService],
  controllers: [PeriodsController, AdminPeriodsController],
  exports: [PeriodsService],
})
export class PeriodsModule {}
