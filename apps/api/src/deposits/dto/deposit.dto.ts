import { IsString, IsOptional, IsNumber } from 'class-validator';

export enum DepositStatus {
  CREATED = 'CREATED',
  AWAITING_TRANSFER = 'AWAITING_TRANSFER',
  DETECTED = 'DETECTED',
  CONFIRMING = 'CONFIRMING',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  REPORT_READY = 'REPORT_READY',
  PAYOUT_PENDING = 'PAYOUT_PENDING',
  PAYOUT_APPROVED = 'PAYOUT_APPROVED',
  PAYOUT_SENT = 'PAYOUT_SENT',
  PAYOUT_CONFIRMED = 'PAYOUT_CONFIRMED',
  ON_HOLD = 'ON_HOLD',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class CreateDepositDto {
  @IsString()
  investment_period_id: string;

  @IsString()
  network: string;

  @IsString()
  asset_symbol: string;

  @IsNumber()
  @IsOptional()
  requested_amount?: number;
}

export class DepositDto {
  deposit_id: string;
  user_id: string;
  investment_period_id: string;
  network: string;
  asset_symbol: string;
  deposit_route: string;
  source_address: string | null;
  tx_hash: string | null;
  requested_amount: number | null;
  confirmed_amount: number | null;
  confirmation_count: number;
  status: string;
  status_reason: string | null;
  route_expires_at: string | null;
  created_at: string;
  detected_at: string | null;
  confirmed_at: string | null;
  activated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

export class TransitionDepositDto {
  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
