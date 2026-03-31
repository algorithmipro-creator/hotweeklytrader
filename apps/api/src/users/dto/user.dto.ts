import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export class UserProfileDto {
  user_id: string;
  telegram_id: string;
  username: string | null;
  display_name: string | null;
  language: string;
  status: string;
  legal_ack_version: string | null;
  risk_ack_version: string | null;
  created_at: string;
  last_login_at: string | null;
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  legal_ack_version?: string;

  @IsString()
  @IsOptional()
  risk_ack_version?: string;
}
