import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async authenticateTelegram(initData: string) {
    const parsed = this.validateTelegramInitData(initData);
    const telegramId = BigInt(parsed.id);
    const isAdmin = this.isAdminTelegramId(parsed.id);
    const role = isAdmin ? UserRole.ADMIN : UserRole.USER;

    const user = await this.prisma.user.upsert({
      where: { telegram_id: telegramId },
      update: {
        last_login_at: new Date(),
        username: parsed.username || undefined,
        display_name: [parsed.first_name, parsed.last_name].filter(Boolean).join(' ') || undefined,
        role: isAdmin ? role : undefined,
      },
      create: {
        telegram_id: telegramId,
        username: parsed.username || null,
        display_name: [parsed.first_name, parsed.last_name].filter(Boolean).join(' ') || null,
        last_login_at: new Date(),
        role,
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.user_id,
      telegram_id: user.telegram_id.toString(),
      role: user.role,
    });

    return {
      accessToken,
      user: {
        user_id: user.user_id,
        telegram_id: user.telegram_id.toString(),
        username: user.username,
        display_name: user.display_name,
        status: user.status,
        role: user.role,
      },
    };
  }

  private validateTelegramInitData(initData: string): Record<string, string> {
    if (!initData || initData.trim().length === 0) {
      throw new BadRequestException('initData is required');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');

    if (!hash) {
      throw new BadRequestException('hash is missing in initData');
    }

    params.delete('hash');

    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const botToken = this.configService.get<string>('telegram.botToken');
    if (!botToken) {
      throw new BadRequestException('Telegram bot token not configured');
    }

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(sortedParams).digest('hex');

    if (computedHash !== hash) {
      throw new UnauthorizedException('Invalid Telegram initData signature');
    }

    const result: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }

    this.validateAuthDate(result.auth_date);

    if (result.user) {
      const userData = JSON.parse(result.user);
      return { ...userData, id: userData.id.toString() };
    }

    return result;
  }

  private validateAuthDate(authDateValue?: string) {
    if (!authDateValue) {
      throw new BadRequestException('auth_date is missing in initData');
    }

    const authDate = Number(authDateValue);
    if (!Number.isFinite(authDate)) {
      throw new BadRequestException('auth_date is invalid');
    }

    const maxAgeSeconds = this.configService.get<number>('telegram.initDataMaxAgeSeconds') || 300;
    const now = Math.floor(Date.now() / 1000);
    if (authDate > now + 60) {
      throw new UnauthorizedException('Telegram initData auth_date is invalid');
    }

    if (now - authDate > maxAgeSeconds) {
      throw new UnauthorizedException('Telegram initData is too old');
    }
  }

  private isAdminTelegramId(telegramId: string): boolean {
    const adminTelegramIds = this.configService.get<string[]>('telegram.adminTelegramIds') || [];
    return adminTelegramIds.includes(telegramId);
  }
}
