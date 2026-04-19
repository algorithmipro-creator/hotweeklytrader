import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TelegramAuthDto {
  @IsString()
  @IsNotEmpty()
  initData: string;

  @IsString()
  @IsOptional()
  referralCode?: string;
}

export class AdminPasswordAuthDto {
  @IsString()
  @IsNotEmpty()
  login: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AuthResponseDto {
  accessToken: string;
  user: {
    user_id: string;
    telegram_id: string;
    username: string | null;
    display_name: string | null;
    role: string;
    status: string;
  };
}
