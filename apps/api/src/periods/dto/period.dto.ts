import {
  IsString, IsOptional, IsArray, IsObject, IsDateString, IsNumber, Min, IsIn,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  status?: string;
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

  @IsString()
  @IsOptional()
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accepted_networks?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accepted_assets?: string[];
}

export class PeriodDto {
  investment_period_id: string;
  title: string;
  period_type: string;
  start_date: string;
  end_date: string;
  lock_date: string | null;
  status: string;
  accepted_networks: string[];
  accepted_assets: string[];
  minimum_amount_rules: any;
  maximum_amount_rules: any;
  created_at: string;
  updated_at: string;
}

export class PeriodTraderReportSummaryDto {
  trader_report_id: string | null;
  investment_period_id: string;
  trader_id: string;
  trader_nickname: string;
  trader_slug: string;
  trader_display_name: string;
  status: string;
  required: boolean;
  ending_balance_usdt?: number | null;
  trader_fee_percent?: number | null;
  network_fees_json?: Record<string, number> | null;
  generated_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export class UpsertPeriodTraderReportDto {
  @IsNumber()
  ending_balance_usdt: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  trader_fee_percent?: number;

  @IsObject()
  @IsOptional()
  network_fees_json?: Record<string, number>;
}

export class PeriodTraderReportDto extends PeriodTraderReportSummaryDto {
  ending_balance_usdt: number;
  trader_fee_percent: number;
  network_fees_json: Record<string, number>;
  generated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export class PeriodTraderReportPreviewRowDto {
  deposit_id: string;
  user_id: string;
  user_label: string;
  network: string;
  asset_symbol: string;
  deposit_amount_usdt: number;
  confirmed_amount_usdt: number;
  share_ratio: number;
  payout_gross_usdt: number;
  payout_fee_usdt: number;
  payout_net_usdt: number;
  default_payout_address: string | null;
  selected_payout_address: string | null;
  address_source: string;
  referral_first_deposit_usdt?: number;
  referral_period_profit_usdt?: number;
  referral_reward_total_usdt?: number;
}

export class PeriodTraderReportMetricsSummaryDto {
  source_type: string | null;
  trade_count: number;
  pnl: number;
  profit_percent: number;
  win_rate: number;
  captured_at: string | null;
}

export class PeriodTraderReportRegistrySummaryDto {
  payout_registry_id: string | null;
  exists: boolean;
  row_count: number;
  terminal_row_count: number;
  pending_row_count: number;
}

export class PeriodTraderReportPreviewDto {
  investment_period_id: string;
  trader_id: string;
  trader_nickname: string;
  trader_slug: string;
  trader_display_name: string;
  referral_mode: 'PROJECTED' | 'MATERIALIZED';
  report: PeriodTraderReportDto | null;
  deposit_count: number;
  starting_balance_usdt: number;
  ending_balance_usdt: number;
  realized_profit_usdt: number;
  period_balance_before_fees_usdt: number;
  trader_fee_percent: number;
  total_deposits_usdt: number;
  gross_pnl_usdt: number;
  trader_fee_usdt: number;
  network_fees_json: Record<string, number>;
  total_network_fees_usdt: number;
  net_distributable_usdt: number;
  metrics_summary: PeriodTraderReportMetricsSummaryDto | null;
  registry_summary: PeriodTraderReportRegistrySummaryDto;
  rows: PeriodTraderReportPreviewRowDto[];
}

export class PayoutRegistryRowDto extends PeriodTraderReportPreviewRowDto {
  payout_registry_row_id: string;
  payout_registry_id: string;
  investment_period_id: string;
  trader_report_id: string;
  trader_id: string;
  trader_nickname: string;
  status: string;
  tx_hash: string | null;
  paid_at: string | null;
  failure_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class PayoutRegistryDto {
  payout_registry_id: string;
  investment_period_id: string;
  trader_report_id: string;
  trader_id: string;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
  rows: PayoutRegistryRowDto[];
}

export class PeriodCompletionReadinessDto {
  ready: boolean;
  blockers: string[];
}

export class UpdatePayoutRegistryRowDto {
  @IsOptional()
  @IsIn(['PENDING', 'PAID_MANUAL', 'PAID_BATCH', 'FAILED', 'SKIPPED'])
  status?: string;

  @IsOptional()
  @IsString()
  selected_payout_address?: string;

  @IsOptional()
  @IsString()
  tx_hash?: string;

  @IsOptional()
  @IsString()
  failure_reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkPayoutRegistryUpdateDto {
  updated_count: number;
}
