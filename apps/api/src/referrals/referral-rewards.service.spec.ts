import { Test } from '@nestjs/testing';
import { ReferralRewardType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralRewardsService } from './referral-rewards.service';

describe('ReferralRewardsService', () => {
  let service: ReferralRewardsService;

  const mockPrisma = {
    profitLossReport: {
      findMany: jest.fn(),
    },
    deposit: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    referralReward: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReferralRewardsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ReferralRewardsService);
    jest.resetAllMocks();
    mockPrisma.referralReward.findUnique.mockResolvedValue(null);
    mockPrisma.deposit.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      referral_payout_preference: 'WITHDRAW',
      held_referral_balance_bsc: '0',
      held_referral_balance_ton: '0',
    });
    mockPrisma.user.update.mockResolvedValue({});
  });

  it('creates level 1 and level 2 first-deposit and profit rewards from one published deposit report', async () => {
    mockPrisma.profitLossReport.findMany.mockResolvedValue([
      {
        report_id: 'plr-1',
        net_result: '120',
        deposit: {
          deposit_id: 'dep-1',
          user_id: 'source-user',
          network: 'BSC',
          confirmed_amount: '1000',
          requested_amount: null,
          created_at: new Date('2026-04-01T10:00:00.000Z'),
          user: {
            user_id: 'source-user',
            referred_by_user_id: 'direct-user',
            referred_by: {
              user_id: 'direct-user',
              referred_by_user_id: 'upstream-user',
            },
          },
        },
      },
    ]);

    mockPrisma.deposit.findFirst
      .mockResolvedValueOnce({ deposit_id: 'dep-1' })
      .mockResolvedValueOnce({ deposit_id: 'dep-direct' })
      .mockResolvedValueOnce({ deposit_id: 'dep-upstream' });

    await service.materializeRewardsForPublishedTraderReport('report-1', 'period-1');

    expect(mockPrisma.referralReward.upsert).toHaveBeenCalledTimes(4);
    expect(mockPrisma.referralReward.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: {
        beneficiary_user_id_source_deposit_id_reward_type: {
          beneficiary_user_id: 'direct-user',
          source_deposit_id: 'dep-1',
          reward_type: ReferralRewardType.FIRST_DEPOSIT,
        },
      },
      create: expect.objectContaining({
        beneficiary_user_id: 'direct-user',
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        reward_percent: '0.6',
        reward_amount: '6',
      }),
    }));
    expect(mockPrisma.referralReward.upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      create: expect.objectContaining({
        beneficiary_user_id: 'upstream-user',
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        reward_percent: '0.4',
        reward_amount: '4',
      }),
    }));
    expect(mockPrisma.referralReward.upsert).toHaveBeenNthCalledWith(3, expect.objectContaining({
      create: expect.objectContaining({
        beneficiary_user_id: 'direct-user',
        reward_type: ReferralRewardType.PERIOD_PROFIT,
        reward_percent: '7',
        reward_amount: '8.4',
      }),
    }));
    expect(mockPrisma.referralReward.upsert).toHaveBeenNthCalledWith(4, expect.objectContaining({
      create: expect.objectContaining({
        beneficiary_user_id: 'upstream-user',
        reward_type: ReferralRewardType.PERIOD_PROFIT,
        reward_percent: '5',
        reward_amount: '6',
      }),
    }));
  });

  it('issues FIRST_DEPOSIT rewards for every published source deposit', async () => {
    mockPrisma.profitLossReport.findMany.mockResolvedValue([
      {
        report_id: 'plr-2',
        net_result: '50',
        deposit: {
          deposit_id: 'dep-2',
          user_id: 'source-user',
          network: 'BSC',
          confirmed_amount: '500',
          requested_amount: null,
          created_at: new Date('2026-04-02T10:00:00.000Z'),
          user: {
            user_id: 'source-user',
            referred_by_user_id: 'direct-user',
            referred_by: null,
          },
        },
      },
    ]);

    mockPrisma.deposit.findFirst
      .mockResolvedValueOnce({ deposit_id: 'dep-referrer' });

    await service.materializeRewardsForPublishedTraderReport('report-2', 'period-1');

    expect(mockPrisma.referralReward.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.referralReward.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      create: expect.objectContaining({
        source_deposit_id: 'dep-2',
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        reward_amount: '3',
      }),
    }));
    expect(mockPrisma.referralReward.upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      create: expect.objectContaining({
        source_deposit_id: 'dep-2',
        reward_type: ReferralRewardType.PERIOD_PROFIT,
        reward_amount: '3.5',
      }),
    }));
  });

  it('skips profit rewards when the referrer was not active in the same period, but still issues first-deposit rewards', async () => {
    mockPrisma.profitLossReport.findMany.mockResolvedValue([
      {
        report_id: 'plr-1',
        net_result: '80',
        deposit: {
          deposit_id: 'dep-1',
          user_id: 'source-user',
          network: 'BSC',
          confirmed_amount: '500',
          requested_amount: null,
          created_at: new Date('2026-04-01T10:00:00.000Z'),
          user: {
            user_id: 'source-user',
            referred_by_user_id: 'direct-user',
            referred_by: null,
          },
        },
      },
    ]);

    mockPrisma.deposit.findFirst
      .mockResolvedValueOnce(null);

    await service.materializeRewardsForPublishedTraderReport('report-1', 'period-1');

    expect(mockPrisma.referralReward.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.referralReward.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        reward_amount: '3',
      }),
    }));
  });

  it('skips profit rewards for zero or negative published profit', async () => {
    mockPrisma.profitLossReport.findMany.mockResolvedValue([
      {
        report_id: 'plr-1',
        net_result: '0',
        deposit: {
          deposit_id: 'dep-1',
          user_id: 'source-user',
          network: 'BSC',
          confirmed_amount: '400',
          requested_amount: null,
          created_at: new Date('2026-04-01T10:00:00.000Z'),
          user: {
            user_id: 'source-user',
            referred_by_user_id: 'direct-user',
            referred_by: null,
          },
        },
      },
    ]);

    await service.materializeRewardsForPublishedTraderReport('report-1', 'period-1');

    expect(mockPrisma.referralReward.upsert).toHaveBeenCalledTimes(1);
    expect(mockPrisma.referralReward.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        reward_amount: '2.4',
      }),
    }));
  });

  it('reconciles held referral balances downward when a reward amount is recalculated lower', async () => {
    mockPrisma.profitLossReport.findMany.mockResolvedValue([
      {
        report_id: 'plr-1',
        net_result: '0',
        deposit: {
          deposit_id: 'dep-1',
          user_id: 'source-user',
          network: 'BSC',
          confirmed_amount: '1000',
          requested_amount: null,
          created_at: new Date('2026-04-01T10:00:00.000Z'),
          user: {
            user_id: 'source-user',
            referred_by_user_id: 'direct-user',
            referred_by: null,
          },
        },
      },
    ]);

    mockPrisma.referralReward.findUnique.mockResolvedValueOnce({ reward_amount: '10' });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      referral_payout_preference: 'WITHDRAW',
      held_referral_balance_bsc: '25',
    });

    await service.materializeRewardsForPublishedTraderReport('report-1', 'period-1');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { user_id: 'direct-user' },
      data: { held_referral_balance_bsc: '21.00' },
    });
  });

  it('credits TON rewards into the TON held balance bucket', async () => {
    mockPrisma.profitLossReport.findMany.mockResolvedValue([
      {
        report_id: 'plr-ton-1',
        net_result: '0',
        deposit: {
          deposit_id: 'dep-ton-1',
          user_id: 'source-user',
          network: 'TON',
          confirmed_amount: '1000',
          requested_amount: null,
          created_at: new Date('2026-04-01T10:00:00.000Z'),
          user: {
            user_id: 'source-user',
            referred_by_user_id: 'direct-user',
            referred_by: null,
          },
        },
      },
    ]);

    mockPrisma.deposit.findFirst.mockResolvedValueOnce({ deposit_id: 'dep-ton-1' });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      referral_payout_preference: 'WITHDRAW',
      held_referral_balance_ton: '2.50',
    });

    await service.materializeRewardsForPublishedTraderReport('report-ton-1', 'period-1');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { user_id: 'direct-user' },
      data: { held_referral_balance_ton: '8.50' },
    });
  });

  it('calculates projected referral rewards without writing ledger rows or balances', async () => {
    mockPrisma.profitLossReport.findMany.mockResolvedValue([
      {
        report_id: 'plr-1',
        net_result: '120',
        deposit: {
          deposit_id: 'dep-1',
          user_id: 'source-user',
          network: 'BSC',
          confirmed_amount: '1000',
          requested_amount: null,
          created_at: new Date('2026-04-01T10:00:00.000Z'),
          user: {
            user_id: 'source-user',
            referred_by_user_id: 'direct-user',
            referred_by: {
              user_id: 'direct-user',
              referred_by_user_id: 'upstream-user',
            },
          },
        },
      },
    ]);

    mockPrisma.deposit.findFirst
      .mockResolvedValueOnce({ deposit_id: 'dep-direct' })
      .mockResolvedValueOnce({ deposit_id: 'dep-upstream' });

    const preview = await (service as any).previewRewardsForPublishedTraderReport('report-1', 'period-1');

    expect(preview).toEqual([
      expect.objectContaining({
        beneficiary_user_id: 'direct-user',
        source_user_id: 'source-user',
        source_deposit_id: 'dep-1',
        source_report_id: 'plr-1',
        investment_period_id: 'period-1',
        referral_level: 1,
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        base_amount: 1000,
        reward_percent: 0.6,
        reward_amount: 6,
        metadata_json: expect.objectContaining({
          source_trader_report_id: 'report-1',
          balance_bucket: 'held_referral_balance_bsc',
        }),
      }),
      expect.objectContaining({
        beneficiary_user_id: 'upstream-user',
        source_user_id: 'source-user',
        source_deposit_id: 'dep-1',
        source_report_id: 'plr-1',
        investment_period_id: 'period-1',
        referral_level: 2,
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        base_amount: 1000,
        reward_percent: 0.4,
        reward_amount: 4,
        metadata_json: expect.objectContaining({
          source_trader_report_id: 'report-1',
          balance_bucket: 'held_referral_balance_bsc',
        }),
      }),
      expect.objectContaining({
        beneficiary_user_id: 'direct-user',
        source_user_id: 'source-user',
        source_deposit_id: 'dep-1',
        source_report_id: 'plr-1',
        investment_period_id: 'period-1',
        referral_level: 1,
        reward_type: ReferralRewardType.PERIOD_PROFIT,
        base_amount: 120,
        reward_percent: 7,
        reward_amount: 8.4,
        metadata_json: expect.objectContaining({
          source_trader_report_id: 'report-1',
          balance_bucket: 'held_referral_balance_bsc',
        }),
      }),
      expect.objectContaining({
        beneficiary_user_id: 'upstream-user',
        source_user_id: 'source-user',
        source_deposit_id: 'dep-1',
        source_report_id: 'plr-1',
        investment_period_id: 'period-1',
        referral_level: 2,
        reward_type: ReferralRewardType.PERIOD_PROFIT,
        base_amount: 120,
        reward_percent: 5,
        reward_amount: 6,
        metadata_json: expect.objectContaining({
          source_trader_report_id: 'report-1',
          balance_bucket: 'held_referral_balance_bsc',
        }),
      }),
    ]);
    expect(mockPrisma.referralReward.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.referralReward.findUnique).not.toHaveBeenCalled();
  });

  it('returns only first-deposit preview rewards when profit is non-positive or referrers are inactive', async () => {
    mockPrisma.profitLossReport.findMany.mockResolvedValue([
      {
        report_id: 'plr-2',
        net_result: '0',
        deposit: {
          deposit_id: 'dep-2',
          user_id: 'source-user',
          network: 'TON',
          confirmed_amount: '500',
          requested_amount: null,
          created_at: new Date('2026-04-02T10:00:00.000Z'),
          user: {
            user_id: 'source-user',
            referred_by_user_id: 'direct-user',
            referred_by: {
              user_id: 'direct-user',
              referred_by_user_id: 'upstream-user',
            },
          },
        },
      },
    ]);

    const preview = await (service as any).previewRewardsForPublishedTraderReport('report-2', 'period-1');

    expect(preview).toEqual([
      expect.objectContaining({
        beneficiary_user_id: 'direct-user',
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        reward_amount: 3,
        metadata_json: expect.objectContaining({
          balance_bucket: 'held_referral_balance_ton',
        }),
      }),
      expect.objectContaining({
        beneficiary_user_id: 'upstream-user',
        reward_type: ReferralRewardType.FIRST_DEPOSIT,
        reward_amount: 2,
        metadata_json: expect.objectContaining({
          balance_bucket: 'held_referral_balance_ton',
        }),
      }),
    ]);
    expect(mockPrisma.deposit.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.referralReward.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('lists reward ledger rows with normalized admin-facing fields', async () => {
    const createdAt = new Date('2026-04-10T00:00:00.000Z');
    const settledAt = new Date('2026-04-10T01:00:00.000Z');

    mockPrisma.referralReward.findMany.mockResolvedValue([
      {
        referral_reward_id: 'reward-1',
        beneficiary_user_id: 'beneficiary-1',
        source_user_id: 'source-1',
        source_deposit_id: 'deposit-1',
        source_report_id: 'report-1',
        investment_period_id: 'period-1',
        referral_level: 1,
        reward_type: 'PERIOD_PROFIT',
        base_amount: '120',
        reward_percent: '5',
        reward_amount: '6',
        status: 'PENDING',
        created_at: createdAt,
        settled_at: settledAt,
        beneficiary_user: {
          user_id: 'beneficiary-1',
          username: 'alice',
          display_name: 'Alice',
          referral_code: 'ALICE01',
        },
        source_user: {
          user_id: 'source-1',
          username: 'bob',
          display_name: 'Bob',
          referral_code: 'BOB01',
        },
        investment_period: {
          investment_period_id: 'period-1',
          title: 'Sprint 1',
          period_type: 'sprint',
          status: 'COMPLETED',
        },
      },
    ]);

    const result = await service.listRewardLedger();

    expect(result).toEqual([
      expect.objectContaining({
        referral_reward_id: 'reward-1',
        beneficiary: expect.objectContaining({ user_id: 'beneficiary-1', display_name: 'Alice' }),
        source_user: expect.objectContaining({ user_id: 'source-1', display_name: 'Bob' }),
        source_deposit_id: 'deposit-1',
        source_report_id: 'report-1',
        investment_period: expect.objectContaining({ investment_period_id: 'period-1', title: 'Sprint 1' }),
        referral_level: 1,
        reward_type: 'PERIOD_PROFIT',
        base_amount: 120,
        reward_percent: 5,
        reward_amount: 6,
        status: 'PENDING',
        created_at: createdAt.toISOString(),
        settled_at: settledAt.toISOString(),
      }),
    ]);
  });

  it('passes ledger filters through to prisma', async () => {
    mockPrisma.referralReward.findMany.mockResolvedValue([]);

    await service.listRewardLedger({
      status: 'PENDING',
      rewardType: 'FIRST_DEPOSIT',
      level: '2',
      periodId: 'period-1',
      beneficiaryUserId: 'beneficiary-1',
      sourceUserId: 'source-1',
    });

    expect(mockPrisma.referralReward.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        status: 'PENDING',
        reward_type: 'FIRST_DEPOSIT',
        referral_level: 2,
        investment_period_id: 'period-1',
        beneficiary_user_id: 'beneficiary-1',
        source_user_id: 'source-1',
      },
      orderBy: { created_at: 'desc' },
    }));
  });
});
