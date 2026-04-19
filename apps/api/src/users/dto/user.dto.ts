import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
}

export class UserProfileDto {
  user_id: string;
  telegram_id: string;
  username: string | null;
  display_name: string | null;
  language: string;
  role: string;
  status: string;
  legal_ack_version: string | null;
  risk_ack_version: string | null;
  created_at: string;
  last_login_at: string | null;
}

export class ReferralRewardHistoryItemDto {
  referral_reward_id: string;
  source_deposit_id: string;
  source_report_id: string | null;
  investment_period_id: string;
  referral_level: number;
  reward_type: string;
  base_amount: number;
  reward_percent: number;
  reward_amount: number;
  status: string;
  created_at: string;
  balance_bucket: string | null;
  source_user: {
    user_id: string;
    username: string | null;
    display_name: string | null;
  };
  source_deposit: {
    deposit_id: string;
    network: string;
    confirmed_amount: number;
    created_at: string;
  } | null;
}

export class ReferralProfileDto {
  referral_code: string;
  referral_payout_preference: string;
  held_referral_balances: Record<string, number>;
  reward_history: ReferralRewardHistoryItemDto[];
}

export class TeamMemberPreviewDto {
  user_id: string;
  username: string | null;
  display_name: string | null;
  level: 1 | 2;
  joined_at: string;
  is_active: boolean;
  deposit_count: number;
  confirmed_total_usdt: number;
}

export class ReferralTeamDto {
  referral_code: string;
  referral_link: string;
  summary: {
    team_count: number;
    level_one_count: number;
    level_two_count: number;
    active_count: number;
  };
  members: TeamMemberPreviewDto[];
}

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  legal_ack_version?: string;

  @IsString()
  @IsOptional()
  risk_ack_version?: string;
}
