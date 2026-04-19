import { Module } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodsController } from './periods.controller';
import { AdminPeriodsController } from './admin-periods.controller';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [ReferralsModule],
  providers: [PeriodsService],
  controllers: [PeriodsController, AdminPeriodsController],
  exports: [PeriodsService],
})
export class PeriodsModule {}
