import { IsNotEmpty, IsString } from 'class-validator';

export class CapturePendingReferralDto {
  @IsString()
  @IsNotEmpty()
  telegramId!: string;

  @IsString()
  @IsNotEmpty()
  referralCode!: string;

  @IsString()
  @IsNotEmpty()
  source!: string;
}
