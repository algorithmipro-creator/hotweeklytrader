import { IsString, IsNotEmpty } from 'class-validator';

export class TelegramAuthDto {
  @IsString()
  @IsNotEmpty()
  initData: string;
}

export class AuthResponseDto {
  accessToken: string;
  user: {
    user_id: string;
    telegram_id: string;
    username: string | null;
    display_name: string | null;
    status: string;
  };
}
