import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum SupportCaseStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum SupportCasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateSupportCaseDto {
  @IsString()
  category: string;

  @IsString()
  opened_reason: string;

  @IsString()
  @IsOptional()
  related_deposit_id?: string;

  @IsString()
  @IsOptional()
  priority?: string;
}

export class UpdateSupportCaseDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  assigned_to?: string;

  @IsString()
  @IsOptional()
  resolution_summary?: string;
}

export class SupportCaseDto {
  case_id: string;
  user_id: string;
  user_telegram_id?: string | null;
  user_username?: string | null;
  user_display_name?: string | null;
  related_deposit_id: string | null;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  opened_reason: string;
  resolution_summary: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}
