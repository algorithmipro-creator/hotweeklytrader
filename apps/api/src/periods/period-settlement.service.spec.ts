import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PeriodAnalyticsService } from './period-analytics.service';
import { PeriodSettlementService } from './period-settlement.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PeriodSettlementService', () => {
  let service: PeriodSettlementService;

  const mockPrisma = {
    investmentPeriod: {
      findUnique: jest.fn(),
    },
    periodSettlementSnapshot: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockAnalytics = {
    getSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PeriodSettlementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PeriodAnalyticsService, useValue: mockAnalytics },
      ],
    }).compile();

    service = module.get(PeriodSettlementService);
    jest.clearAllMocks();
  });

  it('previews a reporting period with the default trader fee and network fees', async () => {
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      status: 'REPORTING',
    });
    mockAnalytics.getSummary.mockResolvedValue({
      depositCount: 4,
      totalDepositedUsdt: 1000,
      averageDepositUsdt: 250,
    });

    await expect(
      service.preview('period-1', {
        ending_balance_usdt: 1500,
        tron_network_fee_usdt: 10,
        ton_network_fee_usdt: 5,
        bsc_network_fee_usdt: 15,
      }),
    ).resolves.toEqual({
      investment_period_id: 'period-1',
      totalDepositsUsdt: 1000,
      endingBalanceUsdt: 1500,
      grossPnlUsdt: 500,
      traderFeePercent: 40,
      traderFeeUsdt: 200,
      netDistributableUsdt: 1270,
      networkFeesUsdt: { TRON: 10, TON: 5, BSC: 15 },
    });
  });

  it('persists and returns a frozen settlement snapshot on approval', async () => {
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      status: 'REPORTING',
    });
    mockAnalytics.getSummary.mockResolvedValue({
      depositCount: 2,
      totalDepositedUsdt: 1000,
      averageDepositUsdt: 500,
    });
    mockPrisma.periodSettlementSnapshot.findUnique.mockResolvedValue(null);
    mockPrisma.periodSettlementSnapshot.create.mockResolvedValue({
      settlement_snapshot_id: 'snapshot-1',
      investment_period_id: 'period-1',
      ending_balance_usdt: new Prisma.Decimal('1300'),
      total_deposits_usdt: new Prisma.Decimal('1000'),
      gross_pnl_usdt: new Prisma.Decimal('300'),
      trader_fee_percent: 25,
      trader_fee_usdt: new Prisma.Decimal('75'),
      network_fees_json: { TRON: 10, TON: 5, BSC: 15 },
      net_distributable_usdt: new Prisma.Decimal('1210'),
      calculated_at: new Date('2026-04-04T00:00:00.000Z'),
      approved_at: new Date('2026-04-04T00:00:00.000Z'),
      approved_by: 'admin-1',
    });

    await expect(
      service.approve(
        'period-1',
        {
          ending_balance_usdt: 1300,
          trader_fee_percent: 25,
          tron_network_fee_usdt: 10,
          ton_network_fee_usdt: 5,
          bsc_network_fee_usdt: 15,
        },
        'admin-1',
      ),
    ).resolves.toEqual({
      investment_period_id: 'period-1',
      settlement_snapshot_id: 'snapshot-1',
      totalDepositsUsdt: 1000,
      endingBalanceUsdt: 1300,
      grossPnlUsdt: 300,
      traderFeePercent: 25,
      traderFeeUsdt: 75,
      netDistributableUsdt: 1210,
      networkFeesUsdt: { TRON: 10, TON: 5, BSC: 15 },
      calculated_at: '2026-04-04T00:00:00.000Z',
      approved_at: '2026-04-04T00:00:00.000Z',
      approved_by: 'admin-1',
    });

    expect(mockPrisma.periodSettlementSnapshot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          investment_period_id: 'period-1',
          trader_fee_percent: 25,
          approved_by: 'admin-1',
        }),
      }),
    );
  });

  it('returns an existing approved snapshot without rewriting it', async () => {
    mockPrisma.periodSettlementSnapshot.findUnique.mockResolvedValue({
      settlement_snapshot_id: 'snapshot-1',
      investment_period_id: 'period-1',
      ending_balance_usdt: new Prisma.Decimal('1300'),
      total_deposits_usdt: new Prisma.Decimal('1000'),
      gross_pnl_usdt: new Prisma.Decimal('300'),
      trader_fee_percent: 25,
      trader_fee_usdt: new Prisma.Decimal('75'),
      network_fees_json: { TRON: 10, TON: 5, BSC: 15 },
      net_distributable_usdt: new Prisma.Decimal('1210'),
      calculated_at: new Date('2026-04-04T00:00:00.000Z'),
      approved_at: new Date('2026-04-04T00:00:00.000Z'),
      approved_by: 'admin-1',
    });

    await expect(
      service.approve('period-1', {
        ending_balance_usdt: 1400,
        trader_fee_percent: 50,
      }),
    ).resolves.toEqual({
      investment_period_id: 'period-1',
      settlement_snapshot_id: 'snapshot-1',
      totalDepositsUsdt: 1000,
      endingBalanceUsdt: 1300,
      grossPnlUsdt: 300,
      traderFeePercent: 25,
      traderFeeUsdt: 75,
      netDistributableUsdt: 1210,
      networkFeesUsdt: { TRON: 10, TON: 5, BSC: 15 },
      calculated_at: '2026-04-04T00:00:00.000Z',
      approved_at: '2026-04-04T00:00:00.000Z',
      approved_by: 'admin-1',
    });

    expect(mockPrisma.periodSettlementSnapshot.create).not.toHaveBeenCalled();
  });
});
