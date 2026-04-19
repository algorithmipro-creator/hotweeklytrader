import {
  Controller, Post, Body, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TelegramAuthDto, AuthResponseDto, AdminPasswordAuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async telegramAuth(@Body() dto: TelegramAuthDto, @Req() req: any): Promise<AuthResponseDto> {
    return this.authService.authenticateTelegram(dto.initData, {
      ip: req.ip,
      referralCode: dto.referralCode,
    });
  }

  @Post('admin-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async adminPasswordAuth(@Body() dto: AdminPasswordAuthDto): Promise<AuthResponseDto> {
    return this.authService.authenticateAdminPassword(dto.login, dto.password);
  }
}
