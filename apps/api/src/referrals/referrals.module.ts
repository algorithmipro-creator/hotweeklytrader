import { Module } from '@nestjs/common';
import { AdminReferralsController } from './admin-referrals.controller';
import { PendingReferralsController } from './pending-referrals.controller';
import { PendingReferralsService } from './pending-referrals.service';
import { ReferralRewardsService } from './referral-rewards.service';

@Module({
  providers: [ReferralRewardsService, PendingReferralsService],
  controllers: [AdminReferralsController, PendingReferralsController],
  exports: [ReferralRewardsService, PendingReferralsService],
})
export class ReferralsModule {}
