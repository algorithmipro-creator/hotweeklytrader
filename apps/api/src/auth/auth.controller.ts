import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuthDto, AuthResponseDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async telegramAuth(@Body() dto: TelegramAuthDto): Promise<AuthResponseDto> {
    return this.authService.authenticateTelegram(dto.initData);
  }
}
