import { IsString, IsNumber, IsOptional } from 'class-validator';

export enum PayoutStatus {
  PREPARED = 'PREPARED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PayoutDestinationRule {
  ORIGINAL_SENDER = 'ORIGINAL_SENDER',
  VERIFIED_ADDRESS = 'VERIFIED_ADDRESS',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
}

export class CreatePayoutDto {
  @IsString()
  deposit_id: string;

  @IsString()
  @IsOptional()
  destination_address?: string;

  @IsString()
  @IsOptional()
  destination_rule?: string;
}

export class CreateBatchDto {
  @IsString({ each: true })
  deposit_ids: string[];
}

export class PayoutDto {
  payout_id: string;
  deposit_id: string;
  payout_batch_id: string | null;
  destination_address: string;
  destination_rule: string;
  amount: number;
  network: string;
  asset_symbol: string;
  tx_hash: string | null;
  blockchain_status: string | null;
  status: string;
  failure_reason: string | null;
  prepared_by: string | null;
  approved_by: string | null;
  sent_by: string | null;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
  confirmed_at: string | null;
}
