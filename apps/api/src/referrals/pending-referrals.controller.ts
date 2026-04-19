import {
  Body, Controller, Headers, HttpCode, HttpStatus, Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CapturePendingReferralDto } from './dto/capture-pending-referral.dto';
import { PendingReferralsService } from './pending-referrals.service';

@Controller('referrals')
export class PendingReferralsController {
  constructor(private readonly pendingReferralsService: PendingReferralsService) {}

  @Post('pending')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async capturePendingReferral(
    @Headers('x-referral-capture-secret') secretHeader: string | undefined,
    @Body() dto: CapturePendingReferralDto,
  ) {
    this.pendingReferralsService.assertCaptureSecret(secretHeader);

    await this.pendingReferralsService.capturePendingReferral(dto);

    return { ok: true };
  }
}
