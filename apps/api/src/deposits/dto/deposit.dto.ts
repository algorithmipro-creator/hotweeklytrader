import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import {
  SettlementPreferenceValue,
} from '../../common/settlement-preference.util';

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
  trader_id: string;

  @IsString()
  network: string;

  @IsString()
  asset_symbol: string;

  @IsString()
  @IsOptional()
  source_address?: string;

  @IsString()
  @IsOptional()
  return_address?: string;

  @IsString()
  @IsOptional()
  ton_deposit_memo?: string;

  @IsString()
  @IsOptional()
  return_memo?: string;

  @IsBoolean()
  @IsOptional()
  sending_from_exchange?: boolean;

  @IsNumber()
  @IsOptional()
  requested_amount?: number;

  @IsEnum(SettlementPreferenceValue)
  @IsOptional()
  settlement_preference?: SettlementPreferenceValue;
}

export class DepositDto {
  deposit_id: string;
  user_id: string;
  investment_period_id: string;
  trader_id: string | null;
  trader_main_address_id: string | null;
  network: string;
  asset_symbol: string;
  deposit_route: string;
  deposit_address: string;
  source_address: string | null;
  return_address: string | null;
  ton_deposit_memo: string | null;
  return_memo: string | null;
  settlement_preference?: SettlementPreferenceValue;
  auto_renew_trader_id_snapshot?: string | null;
  auto_renew_network_snapshot?: string | null;
  auto_renew_asset_symbol_snapshot?: string | null;
  rolled_over_into_deposit_id?: string | null;
  rollover_source_deposit_id?: string | null;
  rollover_attempted_at?: string | null;
  rollover_block_reason?: string | null;
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


export class UpdateDepositReturnRoutingDto {
  @IsString()
  @IsOptional()
  source_address?: string;

  @IsString()
  @IsOptional()
  return_address?: string;

  @IsString()
  @IsOptional()
  return_memo?: string;
}

export class TransitionDepositDto {
  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
