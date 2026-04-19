import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    referralReward: {
      findMany: jest.fn(),
    },
  };
  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'telegram.botName') {
        return 'hotweeklytrader_bot';
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = (module as any).get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUser = {
        user_id: 'test-id',
        telegram_id: BigInt(12345),
        username: 'testuser',
        display_name: 'Test User',
        language: 'en',
        status: 'ACTIVE',
        legal_ack_version: null,
        risk_ack_version: null,
        created_at: new Date(),
        last_login_at: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('test-id');
      expect(result).toBeDefined();
      expect(result.user_id).toBe('test-id');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { user_id: 'test-id' },
        select: expect.any(Object),
      });
    });
  });

  describe('findReferralProfile', () => {
    it('returns referral balances and reward history for the profile screen', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'user-1',
        referral_code: 'ALPHA01',
        referral_payout_preference: 'HOLD',
        held_referral_balance_bsc: '12.5',
        held_referral_balance_ton: '3.25',
      });
      mockPrisma.referralReward.findMany.mockResolvedValue([
        {
          referral_reward_id: 'reward-1',
          source_deposit_id: 'dep-1',
          source_report_id: 'report-1',
          investment_period_id: 'period-1',
          referral_level: 1,
          reward_type: 'FIRST_DEPOSIT',
          base_amount: '120',
          reward_percent: '3',
          reward_amount: '3.6',
          status: 'PENDING',
          created_at: new Date('2026-04-18T10:00:00.000Z'),
          metadata_json: { balance_bucket: 'held_referral_balance_bsc' },
          source_user: {
            user_id: 'source-user',
            username: 'source_name',
            display_name: 'Source Name',
          },
          source_deposit: {
            deposit_id: 'dep-1',
            network: 'BSC',
            confirmed_amount: '120',
            created_at: new Date('2026-04-10T10:00:00.000Z'),
          },
        },
      ]);

      const result = await service.findReferralProfile('user-1');

      expect(result).toEqual({
        referral_code: 'ALPHA01',
        referral_payout_preference: 'HOLD',
        held_referral_balances: {
          BSC: 12.5,
          TON: 3.25,
        },
        reward_history: [
          {
            referral_reward_id: 'reward-1',
            source_deposit_id: 'dep-1',
            source_report_id: 'report-1',
            investment_period_id: 'period-1',
            referral_level: 1,
            reward_type: 'FIRST_DEPOSIT',
            base_amount: 120,
            reward_percent: 3,
            reward_amount: 3.6,
            status: 'PENDING',
            created_at: '2026-04-18T10:00:00.000Z',
            balance_bucket: 'held_referral_balance_bsc',
            source_user: {
              user_id: 'source-user',
              username: 'source_name',
              display_name: 'Source Name',
            },
            source_deposit: {
              deposit_id: 'dep-1',
              network: 'BSC',
              confirmed_amount: 120,
              created_at: '2026-04-10T10:00:00.000Z',
            },
          },
        ],
      });
    });
  });

  describe('findTeam', () => {
    it('returns team summary, referral link, and preview members for the profile team page', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'user-1',
        referral_code: 'ALPHA01',
        referrals: [
          {
            user_id: 'child-1',
            username: 'direct1',
            display_name: 'Direct One',
            referred_at: new Date('2026-04-01T10:00:00.000Z'),
            created_at: new Date('2026-04-01T10:00:00.000Z'),
            deposits: [
              {
                deposit_id: 'dep-1',
                status: 'ACTIVE',
                confirmed_amount: '100',
              },
            ],
            referrals: [
              {
                user_id: 'grandchild-1',
                username: 'indirect1',
                display_name: 'Indirect One',
                referred_at: new Date('2026-04-03T10:00:00.000Z'),
                created_at: new Date('2026-04-03T10:00:00.000Z'),
                deposits: [
                  {
                    deposit_id: 'dep-2',
                    status: 'CREATED',
                    confirmed_amount: null,
                  },
                ],
              },
            ],
          },
          {
            user_id: 'child-2',
            username: 'direct2',
            display_name: 'Direct Two',
            referred_at: null,
            created_at: new Date('2026-04-02T10:00:00.000Z'),
            deposits: [],
            referrals: [],
          },
        ],
      });

      const result = await service.findTeam('user-1');

      expect(result).toEqual({
        referral_code: 'ALPHA01',
        referral_link: 'https://t.me/hotweeklytrader_bot/app?startapp=ALPHA01',
        summary: {
          team_count: 3,
          level_one_count: 2,
          level_two_count: 1,
          active_count: 1,
        },
        members: [
          {
            user_id: 'child-1',
            username: 'direct1',
            display_name: 'Direct One',
            level: 1,
            joined_at: '2026-04-01T10:00:00.000Z',
            is_active: true,
            deposit_count: 1,
            confirmed_total_usdt: 100,
          },
          {
            user_id: 'child-2',
            username: 'direct2',
            display_name: 'Direct Two',
            level: 1,
            joined_at: '2026-04-02T10:00:00.000Z',
            is_active: false,
            deposit_count: 0,
            confirmed_total_usdt: 0,
          },
          {
            user_id: 'grandchild-1',
            username: 'indirect1',
            display_name: 'Indirect One',
            level: 2,
            joined_at: '2026-04-03T10:00:00.000Z',
            is_active: false,
            deposit_count: 1,
            confirmed_total_usdt: 0,
          },
        ],
      });
    });
  });
});
