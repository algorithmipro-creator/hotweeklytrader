import {
  Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PendingReferralsService {
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async capturePendingReferral(input: {
    telegramId: string;
    referralCode: string;
    source: string;
  }) {
    const telegramId = BigInt(input.telegramId);
    const referralCode = input.referralCode.trim().toUpperCase();

    return (this.prisma as any).pendingReferralAttribution.upsert({
      where: { telegram_id: telegramId },
      update: {
        referral_code: referralCode,
        source: input.source,
        expires_at: new Date(Date.now() + this.ttlMs),
        consumed_at: null,
        consumed_by_user_id: null,
      },
      create: {
        telegram_id: telegramId,
        referral_code: referralCode,
        source: input.source,
        expires_at: new Date(Date.now() + this.ttlMs),
      },
    });
  }

  async findActivePendingReferral(telegramId: bigint) {
    const pendingReferral = await (this.prisma as any).pendingReferralAttribution.findUnique({
      where: { telegram_id: telegramId },
    });

    if (!pendingReferral) {
      return null;
    }

    if (pendingReferral.consumed_at) {
      return null;
    }

    if (new Date(pendingReferral.expires_at).getTime() <= Date.now()) {
      return null;
    }

    return pendingReferral;
  }

  async consumePendingReferral(pendingReferralAttributionId: string, userId: string) {
    await (this.prisma as any).pendingReferralAttribution.update({
      where: { pending_referral_attribution_id: pendingReferralAttributionId },
      data: {
        consumed_at: new Date(),
        consumed_by_user_id: userId,
      },
    });
  }

  assertCaptureSecret(secretHeader?: string) {
    const configuredSecret = this.configService.get<string>('REFERRAL_CAPTURE_SECRET');

    if (!configuredSecret || !secretHeader) {
      throw new UnauthorizedException('Referral capture is not authorized');
    }

    const left = Buffer.from(secretHeader);
    const right = Buffer.from(configuredSecret);

    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException('Referral capture is not authorized');
    }
  }
}
