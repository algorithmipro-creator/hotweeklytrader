export interface UpsertTraderPeriodLiveMetricsDto {
  trader_id: string;
  investment_period_id: string;
  source_type: 'MT5';
  profit_percent: string;
  trade_count: number;
  win_rate: string;
  captured_at: string;
  raw_payload?: unknown;
}

export interface TraderPeriodLiveMetricsDto {
  trader_id: string;
  investment_period_id: string;
  source_type: string;
  profit_percent: string;
  trade_count: number;
  win_rate: string;
  captured_at: Date;
  raw_payload?: unknown;
}
