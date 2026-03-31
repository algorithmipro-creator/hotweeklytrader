import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, createHmac } from 'crypto';

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

    const user = await this.prisma.user.upsert({
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
      },
    });

    const accessToken = this.jwtService.sign({
      sub: user.user_id,
      telegram_id: user.telegram_id.toString(),
      role: 'USER',
    });

    return {
      accessToken,
      user: {
        user_id: user.user_id,
        telegram_id: user.telegram_id.toString(),
        username: user.username,
        display_name: user.display_name,
        status: user.status,
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

    if (result.user) {
      const userData = JSON.parse(result.user);
      return { ...userData, id: userData.id.toString() };
    }

    return result;
  }
}
