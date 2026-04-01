import { IsString, IsOptional } from 'class-validator';

export class WalletDto {
  wallet_id: string;
  user_id: string;
  network: string;
  source_address: string;
  payout_address: string | null;
  verification_status: string;
  first_seen_at: string;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export class BindWalletDto {
  @IsString()
  network: string;

  @IsString()
  source_address: string;

  @IsString()
  @IsOptional()
  payout_address?: string;
}

export class UnbindWalletDto {
  @IsString()
  wallet_id: string;
}
