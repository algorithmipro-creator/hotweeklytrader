import { Injectable } from '@nestjs/common';
import { ReportStatus, ReferralRewardType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PublishedDepositReport = {
  report_id: string;
  net_result: unknown;
  deposit: {
    deposit_id: string;
    user_id: string;
    network: string;
    confirmed_amount: unknown;
    requested_amount: unknown;
    created_at: Date;
    user: {
      user_id: string;
      referred_by_user_id: string | null;
      referred_by?: {
        user_id: string;
        referred_by_user_id: string | null;
      } | null;
    };
  };
};

type RewardLedgerFilters = {
  status?: string;
  rewardType?: string;
  level?: string;
  periodId?: string;
  beneficiaryUserId?: string;
  sourceUserId?: string;
};

type ReferralBalanceField = 'held_referral_balance_bsc' | 'held_referral_balance_ton';

type ProjectedReferralReward = {
  beneficiary_user_id: string;
  source_user_id: string;
  source_deposit_id: string;
  source_report_id: string;
  investment_period_id: string;
  referral_level: 1 | 2;
  reward_type: ReferralRewardType;
  base_amount: number;
  reward_percent: number;
  reward_amount: number;
  metadata_json: {
    source_trader_report_id: string;
    balance_bucket: ReferralBalanceField;
  };
};

@Injectable()
export class ReferralRewardsService {
  private readonly activeParticipationStatuses = [
    'ACTIVE',
    'COMPLETED',
    'REPORT_READY',
    'PAYOUT_PENDING',
    'PAYOUT_APPROVED',
    'PAYOUT_SENT',
    'PAYOUT_CONFIRMED',
  ] as const;

  private readonly rewardConfig = {
    1: {
      firstDepositPercent: 0.6,
      periodProfitPercent: 7,
    },
    2: {
      firstDepositPercent: 0.4,
      periodProfitPercent: 5,
    },
  } as const;

  private readonly referralBalanceFieldByNetwork = {
    TON: 'held_referral_balance_ton',
    BSC: 'held_referral_balance_bsc',
  } as const;

  constructor(private prisma: PrismaService) {}

  async listRewardLedger(filters: RewardLedgerFilters = {}) {
    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.rewardType) {
      where.reward_type = filters.rewardType;
    }

    if (filters.level) {
      const parsedLevel = Number.parseInt(filters.level, 10);
      if (!Number.isNaN(parsedLevel)) {
        where.referral_level = parsedLevel;
      }
    }

    if (filters.periodId) {
      where.investment_period_id = filters.periodId;
    }

    if (filters.beneficiaryUserId) {
      where.beneficiary_user_id = filters.beneficiaryUserId;
    }

    if (filters.sourceUserId) {
      where.source_user_id = filters.sourceUserId;
    }

    const rewards = await (this.prisma as any).referralReward.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        beneficiary_user: {
          select: {
            user_id: true,
            username: true,
            display_name: true,
            referral_code: true,
          },
        },
        source_user: {
          select: {
            user_id: true,
            username: true,
            display_name: true,
            referral_code: true,
          },
        },
        investment_period: {
          select: {
            investment_period_id: true,
            title: true,
            period_type: true,
            status: true,
          },
        },
      },
    });

    return rewards.map((reward: any) => ({
      referral_reward_id: reward.referral_reward_id,
      beneficiary: reward.beneficiary_user,
      source_user: reward.source_user,
      source_deposit_id: reward.source_deposit_id,
      source_report_id: reward.source_report_id,
      investment_period: reward.investment_period,
      referral_level: reward.referral_level,
      reward_type: reward.reward_type,
      base_amount: this.parseAmount(reward.base_amount),
      reward_percent: this.parseAmount(reward.reward_percent),
      reward_amount: this.parseAmount(reward.reward_amount),
      status: reward.status,
      created_at: reward.created_at.toISOString(),
      settled_at: reward.settled_at?.toISOString() ?? null,
    }));
  }

  async materializeRewardsForPublishedTraderReport(traderReportId: string, investmentPeriodId: string): Promise<void> {
    const reports = await this.loadPublishedDepositReports(traderReportId);

    const activeParticipationCache = new Map<string, boolean>();

    for (const report of reports as PublishedDepositReport[]) {
      const projectedRewards = await this.collectProjectedRewardsForDepositReport(
        report,
        traderReportId,
        investmentPeriodId,
        activeParticipationCache,
      );

      for (const projectedReward of projectedRewards) {
        await this.upsertReward({
          beneficiaryUserId: projectedReward.beneficiary_user_id,
          sourceUserId: projectedReward.source_user_id,
          sourceDepositId: projectedReward.source_deposit_id,
          sourceReportId: projectedReward.source_report_id,
          investmentPeriodId: projectedReward.investment_period_id,
          referralLevel: projectedReward.referral_level,
          rewardType: projectedReward.reward_type,
          baseAmount: projectedReward.base_amount,
          rewardPercent: projectedReward.reward_percent,
          traderReportId: projectedReward.metadata_json.source_trader_report_id,
          network: report.deposit.network,
        });
      }
    }
  }

  async previewRewardsForPublishedTraderReport(
    traderReportId: string,
    investmentPeriodId: string,
  ): Promise<ProjectedReferralReward[]> {
    const reports = await this.loadPublishedDepositReports(traderReportId);
    const activeParticipationCache = new Map<string, boolean>();
    const projected: ProjectedReferralReward[] = [];

    for (const report of reports as PublishedDepositReport[]) {
      const rewards = await this.collectProjectedRewardsForDepositReport(
        report,
        traderReportId,
        investmentPeriodId,
        activeParticipationCache,
      );
      projected.push(...rewards);
    }

    return projected;
  }

  private async loadPublishedDepositReports(traderReportId: string): Promise<PublishedDepositReport[]> {
    return (this.prisma as any).profitLossReport.findMany({
      where: {
        report_reference: traderReportId,
        status: ReportStatus.PUBLISHED,
      },
      include: {
        deposit: {
          select: {
            deposit_id: true,
            user_id: true,
            network: true,
            confirmed_amount: true,
            requested_amount: true,
            created_at: true,
            user: {
              select: {
                user_id: true,
                referred_by_user_id: true,
                referred_by: {
                  select: {
                    user_id: true,
                    referred_by_user_id: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private async collectProjectedRewardsForDepositReport(
    report: PublishedDepositReport,
    traderReportId: string,
    investmentPeriodId: string,
    activeParticipationCache: Map<string, boolean>,
  ): Promise<ProjectedReferralReward[]> {
    const sourceUser = report.deposit.user;
    if (!sourceUser) {
      return [];
    }

    const directReferrerId = sourceUser.referred_by_user_id;
    const upstreamReferrerId = sourceUser.referred_by?.referred_by_user_id ?? null;

    if (!directReferrerId && !upstreamReferrerId) {
      return [];
    }

    const depositAmount = this.parseAmount(report.deposit.confirmed_amount);
    const netProfit = this.parseAmount(report.net_result);
    const projected: ProjectedReferralReward[] = [];

    if (directReferrerId) {
      const reward = this.buildProjectedReward({
        beneficiaryUserId: directReferrerId,
        sourceUserId: report.deposit.user_id,
        sourceDepositId: report.deposit.deposit_id,
        sourceReportId: report.report_id,
        investmentPeriodId,
        referralLevel: 1,
        rewardType: ReferralRewardType.FIRST_DEPOSIT,
        baseAmount: depositAmount,
        rewardPercent: this.rewardConfig[1].firstDepositPercent,
        traderReportId,
        network: report.deposit.network,
      });
      if (reward) {
        projected.push(reward);
      }
    }

    if (upstreamReferrerId) {
      const reward = this.buildProjectedReward({
        beneficiaryUserId: upstreamReferrerId,
        sourceUserId: report.deposit.user_id,
        sourceDepositId: report.deposit.deposit_id,
        sourceReportId: report.report_id,
        investmentPeriodId,
        referralLevel: 2,
        rewardType: ReferralRewardType.FIRST_DEPOSIT,
        baseAmount: depositAmount,
        rewardPercent: this.rewardConfig[2].firstDepositPercent,
        traderReportId,
        network: report.deposit.network,
      });
      if (reward) {
        projected.push(reward);
      }
    }

    if (netProfit <= 0) {
      return projected;
    }

    if (directReferrerId && await this.hasActiveParticipation(directReferrerId, investmentPeriodId, activeParticipationCache)) {
      const reward = this.buildProjectedReward({
        beneficiaryUserId: directReferrerId,
        sourceUserId: report.deposit.user_id,
        sourceDepositId: report.deposit.deposit_id,
        sourceReportId: report.report_id,
        investmentPeriodId,
        referralLevel: 1,
        rewardType: ReferralRewardType.PERIOD_PROFIT,
        baseAmount: netProfit,
        rewardPercent: this.rewardConfig[1].periodProfitPercent,
        traderReportId,
        network: report.deposit.network,
      });
      if (reward) {
        projected.push(reward);
      }
    }

    if (upstreamReferrerId && await this.hasActiveParticipation(upstreamReferrerId, investmentPeriodId, activeParticipationCache)) {
      const reward = this.buildProjectedReward({
        beneficiaryUserId: upstreamReferrerId,
        sourceUserId: report.deposit.user_id,
        sourceDepositId: report.deposit.deposit_id,
        sourceReportId: report.report_id,
        investmentPeriodId,
        referralLevel: 2,
        rewardType: ReferralRewardType.PERIOD_PROFIT,
        baseAmount: netProfit,
        rewardPercent: this.rewardConfig[2].periodProfitPercent,
        traderReportId,
        network: report.deposit.network,
      });
      if (reward) {
        projected.push(reward);
      }
    }

    return projected;
  }

  private async hasActiveParticipation(
    userId: string,
    investmentPeriodId: string,
    cache: Map<string, boolean>,
  ): Promise<boolean> {
    const cacheKey = `${userId}:${investmentPeriodId}`;
    if (!cache.has(cacheKey)) {
      const qualifyingDeposit = await (this.prisma as any).deposit.findFirst({
        where: {
          user_id: userId,
          investment_period_id: investmentPeriodId,
          status: {
            in: [...this.activeParticipationStatuses],
          },
        },
        select: {
          deposit_id: true,
        },
      });

      cache.set(cacheKey, Boolean(qualifyingDeposit));
    }

    return cache.get(cacheKey) ?? false;
  }

  private async upsertReward(input: {
    beneficiaryUserId: string;
    sourceUserId: string;
    sourceDepositId: string;
    sourceReportId: string;
    investmentPeriodId: string;
    referralLevel: 1 | 2;
    rewardType: ReferralRewardType;
    baseAmount: number;
    rewardPercent: number;
    traderReportId: string;
    network: string;
  }): Promise<void> {
    if (input.baseAmount <= 0) {
      return;
    }

    const rewardAmount = this.round2((input.baseAmount * input.rewardPercent) / 100);
    if (rewardAmount <= 0) {
      return;
    }

    const fieldName = this.resolveReferralBalanceField(input.network);

    const existingReward = await (this.prisma as any).referralReward.findUnique?.({
      where: {
        beneficiary_user_id_source_deposit_id_reward_type: {
          beneficiary_user_id: input.beneficiaryUserId,
          source_deposit_id: input.sourceDepositId,
          reward_type: input.rewardType,
        },
      },
      select: {
        reward_amount: true,
      },
    });

    const beneficiary = await (this.prisma as any).user.findUnique({
      where: { user_id: input.beneficiaryUserId },
      select: {
        referral_payout_preference: true,
        [fieldName]: true,
      },
    });
    const currentBalance = this.parseAmount(beneficiary?.[fieldName]);
    const referralPayoutPreference = beneficiary?.referral_payout_preference ?? 'WITHDRAW';

    await (this.prisma as any).referralReward.upsert({
      where: {
        beneficiary_user_id_source_deposit_id_reward_type: {
          beneficiary_user_id: input.beneficiaryUserId,
          source_deposit_id: input.sourceDepositId,
          reward_type: input.rewardType,
        },
      },
      create: {
        beneficiary_user_id: input.beneficiaryUserId,
        source_user_id: input.sourceUserId,
        source_deposit_id: input.sourceDepositId,
        source_report_id: input.sourceReportId,
        investment_period_id: input.investmentPeriodId,
        referral_level: input.referralLevel,
        reward_type: input.rewardType,
        base_amount: this.round2(input.baseAmount).toString(),
        reward_percent: input.rewardPercent.toString(),
        reward_amount: rewardAmount.toString(),
        metadata_json: {
          source_trader_report_id: input.traderReportId,
          referral_payout_preference: referralPayoutPreference,
          balance_bucket: fieldName,
        },
      },
      update: {
        source_user_id: input.sourceUserId,
        source_report_id: input.sourceReportId,
        investment_period_id: input.investmentPeriodId,
        referral_level: input.referralLevel,
        base_amount: this.round2(input.baseAmount).toString(),
        reward_percent: input.rewardPercent.toString(),
        reward_amount: rewardAmount.toString(),
        metadata_json: {
          source_trader_report_id: input.traderReportId,
          referral_payout_preference: referralPayoutPreference,
          balance_bucket: fieldName,
        },
      },
    });

    const previousRewardAmount = this.parseAmount(existingReward?.reward_amount);
    const deltaAmount = this.round2(rewardAmount - previousRewardAmount);

    if (deltaAmount !== 0) {
      await this.adjustHeldReferralBalance(
        input.beneficiaryUserId,
        fieldName,
        currentBalance,
        deltaAmount,
      );
    }
  }

  private buildProjectedReward(input: {
    beneficiaryUserId: string;
    sourceUserId: string;
    sourceDepositId: string;
    sourceReportId: string;
    investmentPeriodId: string;
    referralLevel: 1 | 2;
    rewardType: ReferralRewardType;
    baseAmount: number;
    rewardPercent: number;
    traderReportId: string;
    network: string;
  }): ProjectedReferralReward | null {
    if (input.baseAmount <= 0) {
      return null;
    }

    const rewardAmount = this.round2((input.baseAmount * input.rewardPercent) / 100);
    if (rewardAmount <= 0) {
      return null;
    }

    return {
      beneficiary_user_id: input.beneficiaryUserId,
      source_user_id: input.sourceUserId,
      source_deposit_id: input.sourceDepositId,
      source_report_id: input.sourceReportId,
      investment_period_id: input.investmentPeriodId,
      referral_level: input.referralLevel,
      reward_type: input.rewardType,
      base_amount: this.round2(input.baseAmount),
      reward_percent: input.rewardPercent,
      reward_amount: rewardAmount,
      metadata_json: {
        source_trader_report_id: input.traderReportId,
        balance_bucket: this.resolveReferralBalanceField(input.network),
      },
    };
  }

  private resolveReferralBalanceField(network: string): ReferralBalanceField {
    return this.referralBalanceFieldByNetwork[network as keyof typeof this.referralBalanceFieldByNetwork]
      ?? 'held_referral_balance_bsc';
  }

  private async adjustHeldReferralBalance(
    userId: string,
    fieldName: string,
    currentBalance: number,
    amount: number,
  ): Promise<void> {
    if (amount === 0) {
      return;
    }

    const nextBalance = Math.max(this.round2(currentBalance + amount), 0);

    await (this.prisma as any).user.update({
      where: { user_id: userId },
      data: {
        [fieldName]: nextBalance.toFixed(2),
      },
    });
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private parseAmount(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const parsed = Number.parseFloat(value.toString());
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}
