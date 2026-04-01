import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum NotificationType {
  DEPOSIT_ROUTE_CREATED = 'DEPOSIT_ROUTE_CREATED',
  TRANSFER_DETECTED = 'TRANSFER_DETECTED',
  TRANSFER_CONFIRMED = 'TRANSFER_CONFIRMED',
  DEPOSIT_ACTIVATED = 'DEPOSIT_ACTIVATED',
  MANUAL_REVIEW_STARTED = 'MANUAL_REVIEW_STARTED',
  DEPOSIT_REJECTED = 'DEPOSIT_REJECTED',
  PERIOD_STARTED = 'PERIOD_STARTED',
  PERIOD_NEARING_END = 'PERIOD_NEARING_END',
  PERIOD_COMPLETED = 'PERIOD_COMPLETED',
  REPORT_READY = 'REPORT_READY',
  PAYOUT_PREPARED = 'PAYOUT_PREPARED',
  PAYOUT_APPROVED = 'PAYOUT_APPROVED',
  PAYOUT_SENT = 'PAYOUT_SENT',
  PAYOUT_CONFIRMED = 'PAYOUT_CONFIRMED',
  PAYOUT_FAILED = 'PAYOUT_FAILED',
  UNSUPPORTED_TOKEN_RECEIVED = 'UNSUPPORTED_TOKEN_RECEIVED',
  DEPOSIT_MISMATCH = 'DEPOSIT_MISMATCH',
  ACCOUNT_FROZEN = 'ACCOUNT_FROZEN',
  SYSTEM_ISSUE = 'SYSTEM_ISSUE',
}

export enum NotificationChannel {
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
}

export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

export class NotificationDto {
  notification_id: string;
  user_id: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  delivery_status: string;
  sent_at: string | null;
  read_at: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
}

export class SendNotificationDto {
  @IsString()
  user_id: string;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  related_entity_type?: string;

  @IsString()
  @IsOptional()
  related_entity_id?: string;
}
