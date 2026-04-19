import {
  Injectable, UnauthorizedException, BadRequestException, Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { PendingReferralsService } from '../referrals/pending-referrals.service';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly authBurstLimit = 5;
  private readonly authBurstWindowMs = 60_000;
  private readonly replayWindowMs = 5 * 60_000;
  private readonly maxInitDataAgeMs = 10 * 60_000;
  private readonly authAttempts = new Map<string, number[]>();
  private readonly usedInitDataHashes = new Map<string, number>();
  private readonly reservedInitDataHashes = new Map<string, number>();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private pendingReferralsService: PendingReferralsService,
  ) {}

  async authenticateAdminPassword(login: string, password: string) {
    const configuredLogin = this.configService.get<string>('admin.webLogin');
    const configuredPassword = this.configService.get<string>('admin.webPassword');
    const ownerTelegramId = this.configService.get<string>('admin.ownerTelegramId');

    if (!configuredLogin || !configuredPassword || !ownerTelegramId) {
      throw new UnauthorizedException('Admin password login is not configured');
    }

    const loginMatches = this.safeSecretEquals(login, configuredLogin);
    const passwordMatches = this.safeSecretEquals(password, configuredPassword);

    if (!loginMatches || !passwordMatches) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const user = await this.prisma.user.findUnique({
      where: { telegram_id: BigInt(ownerTelegramId) },
    }) as any;

    if (!user || user.status !== 'ACTIVE' || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      throw new UnauthorizedException('Admin user not found or inactive');
    }

    return this.buildAuthResponse(user);
  }

  async authenticateTelegram(initData: string, context?: { ip?: string; referralCode?: string }) {
    const params = this.parseTelegramInitData(initData);
    const hash = params.get('hash');
    const authDate = params.get('auth_date');
    const parsed = this.validateTelegramInitData(initData);
    this.enforceTelegramAuthProtection({
      hash,
      authDate,
      tracker: context?.ip || parsed.id,
      telegramId: parsed.id,
    });
    const telegramId = BigInt(parsed.id);
    const existingUser = await (this.prisma.user as any).findUnique({
      where: { telegram_id: telegramId },
    }) as any;
    const explicitReferralCode = this.resolveIncomingReferralCode(context?.referralCode, parsed.start_param);
    const pendingReferral = !existingUser && !explicitReferralCode
      ? await this.pendingReferralsService.findActivePendingReferral(telegramId)
      : null;
    const referralCode = explicitReferralCode || pendingReferral?.referral_code || null;
    const generatedReferralCode = this.buildReferralCode();

    this.reserveTelegramInitData(hash);

    try {
      const referralOwner = referralCode
        ? await this.resolveReferralOwner(referralCode, telegramId)
        : null;
      const user = await (this.prisma.user as any).upsert({
        where: { telegram_id: telegramId },
        update: {
          last_login_at: new Date(),
          username: parsed.username || undefined,
          display_name: [parsed.first_name, parsed.last_name].filter(Boolean).join(' ') || undefined,
        },
        create: {
          telegram_id: telegramId,
          username: parsed.username || null,
          display_name: [parsed.first_name, parsed.last_name].filter(Boolean).join(' ') || null,
          last_login_at: new Date(),
          referral_code: generatedReferralCode,
          referred_by_user_id: referralOwner?.user_id ?? null,
          referred_at: referralOwner ? new Date() : null,
          referral_source: referralOwner
            ? (pendingReferral ? 'telegram_pending_start' : 'telegram_startapp')
            : null,
        },
      }) as any;

      if (pendingReferral && !existingUser) {
        await this.pendingReferralsService.consumePendingReferral(
          pendingReferral.pending_referral_attribution_id,
          user.user_id,
        );
      }

      this.markTelegramInitDataUsed(hash as string);

      return this.buildAuthResponse(user);
    } catch (error) {
      this.releaseTelegramInitData(hash);
      throw error;
    }
  }

  private parseTelegramInitData(initData: string): URLSearchParams {
    if (!initData || initData.trim().length === 0) {
      throw new BadRequestException('initData is required');
    }

    return new URLSearchParams(initData);
  }

  private validateTelegramInitData(initData: string): Record<string, string> {
    const params = this.parseTelegramInitData(initData);
    const hash = params.get('hash');

    if (!hash) {
      throw new BadRequestException('hash is missing in initData');
    }

    params.delete('hash');

    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const webAppSecret = this.configService.get<string>('telegram.webAppSecret');
    if (!webAppSecret) {
      throw new BadRequestException('Telegram WebApp secret not configured');
    }

    const secretKey = Buffer.from(webAppSecret, 'hex');
    const computedHash = createHmac('sha256', secretKey).update(sortedParams).digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram initData signature');
    }

    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }

    if (result.user) {
      const userData = JSON.parse(result.user);
      return {
        ...result,
        ...userData,
        id: userData.id.toString(),
      };
    }

    return result;
  }

  private enforceTelegramAuthProtection(input: {
    hash: string | null;
    authDate: string | null;
    tracker: string;
    telegramId: string;
  }) {
    const now = Date.now();
    this.pruneProtectionMaps(now);

    if (input.authDate) {
      const authDateMs = Number(input.authDate) * 1000;
      if (Number.isFinite(authDateMs) && now - authDateMs > this.maxInitDataAgeMs) {
        throw new UnauthorizedException('Telegram initData expired');
      }
    }

    if (input.hash) {
      const seenAt = this.usedInitDataHashes.get(input.hash);
      if (seenAt && now - seenAt < this.replayWindowMs) {
        this.logger.warn(`Rejected replayed Telegram initData for telegram_id=${input.telegramId}`);
        throw new UnauthorizedException('Telegram initData was already used');
      }

      if (this.reservedInitDataHashes.has(input.hash)) {
        this.logger.warn(`Rejected in-flight Telegram initData for telegram_id=${input.telegramId}`);
        throw new UnauthorizedException('Telegram initData was already used');
      }
    }

    const burstKey = `${input.tracker}:${input.telegramId}`;
    const recentAttempts = (this.authAttempts.get(burstKey) ?? [])
      .filter((timestamp) => now - timestamp < this.authBurstWindowMs);

    if (recentAttempts.length >= this.authBurstLimit) {
      this.authAttempts.set(burstKey, recentAttempts);
      this.logger.warn(`Rejected auth burst for tracker=${input.tracker} telegram_id=${input.telegramId}`);
      throw new UnauthorizedException('Too many requests');
    }

    recentAttempts.push(now);
    this.authAttempts.set(burstKey, recentAttempts);

  }

  private pruneProtectionMaps(now: number) {
    for (const [hash, seenAt] of this.usedInitDataHashes.entries()) {
      if (now - seenAt >= this.replayWindowMs) {
        this.usedInitDataHashes.delete(hash);
      }
    }

    for (const [hash, reservedAt] of this.reservedInitDataHashes.entries()) {
      if (now - reservedAt >= this.replayWindowMs) {
        this.reservedInitDataHashes.delete(hash);
      }
    }

    for (const [key, timestamps] of this.authAttempts.entries()) {
      const recent = timestamps.filter((timestamp) => now - timestamp < this.authBurstWindowMs);
      if (recent.length === 0) {
        this.authAttempts.delete(key);
      } else {
        this.authAttempts.set(key, recent);
      }
    }
  }

  private buildAuthResponse(user: any) {
    const accessToken = this.jwtService.sign({
      sub: user.user_id,
      telegram_id: user.telegram_id.toString(),
      role: user.role ?? 'USER',
    });

    return {
      accessToken,
      user: {
        user_id: user.user_id,
        telegram_id: user.telegram_id.toString(),
        username: user.username,
        display_name: user.display_name,
        role: user.role ?? 'USER',
        status: user.status,
      },
    };
  }

  private markTelegramInitDataUsed(hash: string) {
    this.reservedInitDataHashes.delete(hash);
    this.usedInitDataHashes.set(hash, Date.now());
  }

  private reserveTelegramInitData(hash: string | null) {
    if (!hash) {
      return;
    }

    if (this.usedInitDataHashes.has(hash) || this.reservedInitDataHashes.has(hash)) {
      throw new UnauthorizedException('Telegram initData was already used');
    }

    this.reservedInitDataHashes.set(hash, Date.now());
  }

  private releaseTelegramInitData(hash: string | null) {
    if (!hash) {
      return;
    }

    this.reservedInitDataHashes.delete(hash);
  }

  private buildReferralCode(): string {
    return randomBytes(6).toString('hex').toUpperCase();
  }

  private resolveIncomingReferralCode(referralCode?: string | null, startParam?: string | null): string | null {
    const normalizedReferralCode = referralCode?.trim().toUpperCase();
    if (normalizedReferralCode) {
      return normalizedReferralCode;
    }

    const normalizedStartParam = startParam?.trim();
    if (!normalizedStartParam?.toLowerCase().startsWith('ref_')) {
      return null;
    }

    const fallbackCode = normalizedStartParam.slice(4).trim().toUpperCase();
    return fallbackCode || null;
  }

  private async resolveReferralOwner(referralCode: string, telegramId: bigint): Promise<{ user_id: string; telegram_id: bigint } | null> {
    const referralOwner = await (this.prisma.user as any).findUnique({
      where: { referral_code: referralCode },
      select: { user_id: true, telegram_id: true },
    }) as { user_id: string; telegram_id: bigint } | null;

    if (!referralOwner) {
      return null;
    }

    if (referralOwner.telegram_id?.toString() === telegramId.toString()) {
      return null;
    }

    return referralOwner;
  }

  private safeSecretEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
