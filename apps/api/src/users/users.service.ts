import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        telegram_id: true,
        username: true,
        display_name: true,
        language: true,
        role: true,
        status: true,
        legal_ack_version: true,
        risk_ack_version: true,
        created_at: true,
        last_login_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      telegram_id: user.telegram_id.toString(),
      created_at: user.created_at.toISOString(),
      last_login_at: user.last_login_at?.toISOString() || null,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        language: dto.language,
        legal_ack_version: dto.legal_ack_version,
        risk_ack_version: dto.risk_ack_version,
      },
      select: {
        user_id: true,
        telegram_id: true,
        username: true,
        display_name: true,
        language: true,
        role: true,
        status: true,
        legal_ack_version: true,
        risk_ack_version: true,
        created_at: true,
        last_login_at: true,
      },
    });

    return {
      ...user,
      telegram_id: user.telegram_id.toString(),
      created_at: user.created_at.toISOString(),
      last_login_at: user.last_login_at?.toISOString() || null,
    };
  }

  async findReferralProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        referral_code: true,
        referral_payout_preference: true,
        held_referral_balance_bsc: true,
        held_referral_balance_ton: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rewards = await (this.prisma as any).referralReward.findMany({
      where: { beneficiary_user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        referral_reward_id: true,
        source_deposit_id: true,
        source_report_id: true,
        investment_period_id: true,
        referral_level: true,
        reward_type: true,
        base_amount: true,
        reward_percent: true,
        reward_amount: true,
        status: true,
        created_at: true,
        metadata_json: true,
        source_user: {
          select: {
            user_id: true,
            username: true,
            display_name: true,
          },
        },
        source_deposit: {
          select: {
            deposit_id: true,
            network: true,
            confirmed_amount: true,
            created_at: true,
          },
        },
      },
    });

    return {
      referral_code: user.referral_code,
      referral_payout_preference: user.referral_payout_preference,
      held_referral_balances: {
        BSC: this.toNumber(user.held_referral_balance_bsc),
        TON: this.toNumber(user.held_referral_balance_ton),
      },
      reward_history: rewards.map((reward: any) => ({
        referral_reward_id: reward.referral_reward_id,
        source_deposit_id: reward.source_deposit_id,
        source_report_id: reward.source_report_id ?? null,
        investment_period_id: reward.investment_period_id,
        referral_level: reward.referral_level,
        reward_type: reward.reward_type,
        base_amount: this.toNumber(reward.base_amount),
        reward_percent: this.toNumber(reward.reward_percent),
        reward_amount: this.toNumber(reward.reward_amount),
        status: reward.status,
        created_at: reward.created_at.toISOString(),
        balance_bucket: (reward.metadata_json as any)?.balance_bucket ?? null,
        source_user: {
          user_id: reward.source_user.user_id,
          username: reward.source_user.username ?? null,
          display_name: reward.source_user.display_name ?? null,
        },
        source_deposit: reward.source_deposit ? {
          deposit_id: reward.source_deposit.deposit_id,
          network: reward.source_deposit.network,
          confirmed_amount: this.toNumber(reward.source_deposit.confirmed_amount),
          created_at: reward.source_deposit.created_at.toISOString(),
        } : null,
      })),
    };
  }

  async findTeam(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        referral_code: true,
        referrals: {
          orderBy: { created_at: 'asc' },
          select: {
            user_id: true,
            username: true,
            display_name: true,
            referred_at: true,
            created_at: true,
            deposits: {
              select: {
                deposit_id: true,
                status: true,
                confirmed_amount: true,
              },
            },
            referrals: {
              orderBy: { created_at: 'asc' },
              select: {
                user_id: true,
                username: true,
                display_name: true,
                referred_at: true,
                created_at: true,
                deposits: {
                  select: {
                    deposit_id: true,
                    status: true,
                    confirmed_amount: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const directMembers = user.referrals.map((member) => this.toTeamMember(member, 1));
    const indirectMembers = user.referrals.flatMap((member) => member.referrals.map((child) => this.toTeamMember(child, 2)));
    const members = [...directMembers, ...indirectMembers];
    const botName = this.configService.get<string>('telegram.botName') || '';

    return {
      referral_code: user.referral_code,
      referral_link: botName
        ? `https://t.me/${botName}/app?startapp=${user.referral_code}`
        : '',
      summary: {
        team_count: members.length,
        level_one_count: directMembers.length,
        level_two_count: indirectMembers.length,
        active_count: members.filter((member) => member.is_active).length,
      },
      members,
    };
  }

  async getAdminUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        telegram_id: true,
        referral_code: true,
        referred_by_user_id: true,
        referred_at: true,
        username: true,
        display_name: true,
        language: true,
        role: true,
        status: true,
        created_at: true,
        last_login_at: true,
        held_referral_balance_bsc: true,
        held_referral_balance_ton: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      telegram_id: user.telegram_id.toString(),
      referred_at: user.referred_at?.toISOString() || null,
      created_at: user.created_at.toISOString(),
      last_login_at: user.last_login_at?.toISOString() || null,
      held_referral_balance_bsc: this.toNumber(user.held_referral_balance_bsc),
      held_referral_balance_ton: this.toNumber(user.held_referral_balance_ton),
    };
  }

  async getReferralTree(userId: string) {
    const team = await this.findTeam(userId);

    return {
      referral_code: team.referral_code,
      referral_link: team.referral_link,
      summary: team.summary,
      nodes: team.members.map((member) => ({
        user_id: member.user_id,
        username: member.username,
        display_name: member.display_name,
        referral_level: member.level,
        joined_at: member.joined_at,
        is_active: member.is_active,
        deposit_count: member.deposit_count,
        confirmed_total_usdt: member.confirmed_total_usdt,
      })),
    };
  }

  async reassignReferrer(
    userId: string,
    referrerUserId: string | null | undefined,
    input: { actorUserId: string; reason?: string | null },
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: { user_id: true, referred_by_user_id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (referrerUserId) {
      if (referrerUserId === userId) {
        throw new NotFoundException('User cannot refer themselves');
      }

      const referrer = await this.prisma.user.findUnique({
        where: { user_id: referrerUserId },
        select: { user_id: true },
      });

      if (!referrer) {
        throw new NotFoundException('Referrer not found');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        referred_by_user_id: referrerUserId ?? null,
        referred_at: referrerUserId ? new Date() : null,
      },
      select: {
        user_id: true,
        referred_by_user_id: true,
        referred_at: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        actor_user_id: input.actorUserId,
        entity_type: 'USER',
        entity_id: userId,
        action: 'REFERRER_REASSIGNED',
        after_json: {
          referred_by_user_id: updatedUser.referred_by_user_id,
          referred_at: updatedUser.referred_at?.toISOString() ?? null,
          reason: input.reason ?? null,
        } as any,
      } as any,
    });

    return {
      user_id: updatedUser.user_id,
      referred_by_user_id: updatedUser.referred_by_user_id,
      referred_at: updatedUser.referred_at?.toISOString() || null,
    };
  }

  private toTeamMember(member: any, level: 1 | 2) {
    const depositCount = member.deposits.length;
    const confirmedTotal = member.deposits.reduce(
      (sum: number, deposit: any) => sum + this.toNumber(deposit.confirmed_amount),
      0,
    );

    return {
      user_id: member.user_id,
      username: member.username ?? null,
      display_name: member.display_name ?? null,
      level,
      joined_at: (member.referred_at ?? member.created_at).toISOString(),
      is_active: member.deposits.some((deposit: any) => this.isActiveDeposit(deposit)),
      deposit_count: depositCount,
      confirmed_total_usdt: confirmedTotal,
    };
  }

  private isActiveDeposit(deposit: { status?: string | null; confirmed_amount?: unknown }) {
    const activeStatuses = new Set([
      'CONFIRMED',
      'ACTIVE',
      'COMPLETED',
      'REPORT_READY',
      'PAYOUT_PENDING',
      'PAYOUT_APPROVED',
      'PAYOUT_SENT',
      'PAYOUT_CONFIRMED',
    ]);

    return activeStatuses.has(deposit.status ?? '') || this.toNumber(deposit.confirmed_amount) > 0;
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }
}
