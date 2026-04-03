import { IsString, IsOptional, IsArray, IsObject, IsDateString, IsEnum } from 'class-validator';

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
  created_at: string;
  updated_at: string;
}
