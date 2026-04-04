import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsDateString,
  IsEnum,
  IsNumber,
  IsDefined,
} from 'class-validator';
import { Transform } from 'class-transformer';

const strictNumberTransform = () =>
  Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    if (typeof value === 'string' && value.trim() === '') return Number.NaN;
    if (typeof value === 'string') return Number(value);
    return value;
  });

export enum PeriodStatus {
  FUNDING = 'FUNDING',
  TRADING_ACTIVE = 'TRADING_ACTIVE',
  REPORTING = 'REPORTING',
  PAYOUT_IN_PROGRESS = 'PAYOUT_IN_PROGRESS',
  CLOSED = 'CLOSED',
}

export class CreatePeriodDto {
  @IsString()
  title: string;

  @IsString()
  period_type: string;

  @IsDateString()
  start_date: string;

  @IsDateString()
  end_date: string;

  @IsDateString()
  @IsOptional()
  lock_date?: string;

  @IsArray()
  @IsString({ each: true })
  accepted_networks: string[];

  @IsArray()
  @IsString({ each: true })
  accepted_assets: string[];

  @IsObject()
  @IsOptional()
  minimum_amount_rules?: Record<string, number>;

  @IsObject()
  @IsOptional()
  maximum_amount_rules?: Record<string, number>;
}

export class UpdatePeriodDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsDateString()
  @IsOptional()
  lock_date?: string;

  @IsEnum(PeriodStatus)
  @IsOptional()
  status?: PeriodStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accepted_networks?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accepted_assets?: string[];
}

export class PeriodSettlementInputDto {
  @strictNumberTransform()
  @IsNumber()
  ending_balance_usdt: number;

  @strictNumberTransform()
  @IsNumber()
  @IsOptional()
  trader_fee_percent?: number;

  @strictNumberTransform()
  @IsNumber()
  @IsOptional()
  tron_network_fee_usdt?: number;

  @strictNumberTransform()
  @IsNumber()
  @IsOptional()
  ton_network_fee_usdt?: number;

  @strictNumberTransform()
  @IsNumber()
  @IsOptional()
  bsc_network_fee_usdt?: number;
}

export class ApprovePeriodSettlementDto extends PeriodSettlementInputDto {
  @IsString()
  @IsDefined()
  preview_signature: string;
}

export class PeriodSettlementPreviewDto {
  investment_period_id: string;
  totalDepositsUsdt: number;
  endingBalanceUsdt: number;
  grossPnlUsdt: number;
  traderFeePercent: number;
  traderFeeUsdt: number;
  netDistributableUsdt: number;
  networkFeesUsdt: {
    TRON: number;
    TON: number;
    BSC: number;
  };
  preview_signature: string;
}

export class PeriodSettlementSnapshotDto {
  investment_period_id: string;
  totalDepositsUsdt: number;
  endingBalanceUsdt: number;
  grossPnlUsdt: number;
  traderFeePercent: number;
  traderFeeUsdt: number;
  netDistributableUsdt: number;
  networkFeesUsdt: {
    TRON: number;
    TON: number;
    BSC: number;
  };
  settlement_snapshot_id: string;
  calculated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  preview_signature?: string;
}

export class PeriodDto {
  investment_period_id: string;
  title: string;
  period_type: string;
  start_date: string;
  end_date: string;
  lock_date: string | null;
  status: PeriodStatus;
  accepted_networks: string[];
  accepted_assets: string[];
  minimum_amount_rules: any;
  maximum_amount_rules: any;
  depositCount?: number;
  totalDepositedUsdt?: number;
  averageDepositUsdt?: number;
  settlement_snapshot?: PeriodSettlementSnapshotDto | null;
  created_at: string;
  updated_at: string;
}
