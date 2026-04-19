import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ReferralRewardsService } from './referral-rewards.service';

@Controller('admin/referral-rewards')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminReferralsController {
  constructor(private readonly referralRewardsService: ReferralRewardsService) {}

  @Get()
  async listRewardLedger(
    @Query('status') status?: string,
    @Query('rewardType') rewardType?: string,
    @Query('level') level?: string,
    @Query('periodId') periodId?: string,
    @Query('beneficiaryUserId') beneficiaryUserId?: string,
    @Query('sourceUserId') sourceUserId?: string,
  ) {
    return this.referralRewardsService.listRewardLedger({
      status,
      rewardType,
      level,
      periodId,
      beneficiaryUserId,
      sourceUserId,
    });
  }
}
