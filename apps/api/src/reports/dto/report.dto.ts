import { IsString, IsOptional, IsNumber } from 'class-validator';

export enum ReportStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  REVISED = 'REVISED',
}

export class CreateReportDto {
  @IsString()
  deposit_id: string;

  @IsNumber()
  gross_result: number;

  @IsNumber()
  @IsOptional()
  fee_amount?: number;

  @IsString()
  @IsOptional()
  calculation_method?: string;

  @IsString()
  @IsOptional()
  report_file_url?: string;
}

export class UpdateReportDto {
  @IsNumber()
  @IsOptional()
  gross_result?: number;

  @IsNumber()
  @IsOptional()
  fee_amount?: number;

  @IsString()
  @IsOptional()
  calculation_method?: string;

  @IsString()
  @IsOptional()
  report_file_url?: string;
}

export class ReportDto {
  report_id: string;
  deposit_id: string;
  gross_result: number;
  fee_amount: number;
  net_result: number;
  payout_amount: number;
  calculation_method: string | null;
  report_file_url: string | null;
  report_reference: string | null;
  generated_at: string;
  approved_at: string | null;
  published_at: string | null;
  generated_by: string | null;
  approved_by: string | null;
  status: string;
}
