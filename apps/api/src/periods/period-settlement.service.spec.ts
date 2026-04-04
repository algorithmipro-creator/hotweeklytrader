import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PeriodAnalyticsService } from './period-analytics.service';
import { PeriodSettlementService } from './period-settlement.service';
import { PrismaService } from '../prisma/prisma.service';
import { PeriodSettlementInputDto } from './dto/period.dto';

describe('PeriodSettlementService', () => {
  let service: PeriodSettlementService;

  const mockPrisma = {
    investmentPeriod: {
      findUnique: jest.fn(),
    },
    periodSettlementSnapshot: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
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
      preview_signature: expect.any(String),
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
    mockPrisma.periodSettlementSnapshot.upsert.mockResolvedValue({
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

    const preview = await service.preview('period-1', {
      ending_balance_usdt: 1300,
      trader_fee_percent: 25,
      tron_network_fee_usdt: 10,
      ton_network_fee_usdt: 5,
      bsc_network_fee_usdt: 15,
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
          preview_signature: preview.preview_signature,
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

    const approveCreate = mockPrisma.periodSettlementSnapshot.upsert.mock.calls[0][0].create;
    expect(approveCreate.investment_period_id).toBe('period-1');
    expect(approveCreate.trader_fee_percent).toBe(25);
    expect(approveCreate.approved_by).toBe('admin-1');
    expect(approveCreate.ending_balance_usdt.toString()).toBe('1300');
    expect(approveCreate.total_deposits_usdt.toString()).toBe('1000');
    expect(approveCreate.gross_pnl_usdt.toString()).toBe('300');
    expect(approveCreate.trader_fee_usdt.toString()).toBe('75');
    expect(approveCreate.net_distributable_usdt.toString()).toBe('1195');
  });

  it('rejects stale approve attempts when previewed inputs no longer match live analytics', async () => {
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      status: 'REPORTING',
    });
    mockAnalytics.getSummary
      .mockResolvedValueOnce({
        depositCount: 2,
        totalDepositedUsdt: 100,
        averageDepositUsdt: 50,
      })
      .mockResolvedValueOnce({
        depositCount: 2,
        totalDepositedUsdt: 110,
        averageDepositUsdt: 55,
      });

    const preview = await service.preview('period-1', {
      ending_balance_usdt: 150,
      trader_fee_percent: 40,
    });

    await expect(service.approve('period-1', {
      ending_balance_usdt: 150,
      trader_fee_percent: 40,
      preview_signature: preview.preview_signature,
    } as any, 'admin-1')).rejects.toThrow('Settlement preview is stale. Please preview again before approving.');
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
        preview_signature: 'snapshot-sig',
      } as any),
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

    expect(mockPrisma.periodSettlementSnapshot.upsert).not.toHaveBeenCalled();
  });

  it('uses decimal-safe math for fractional settlement values', async () => {
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      status: 'REPORTING',
    });
    mockAnalytics.getSummary.mockResolvedValue({
      depositCount: 2,
      totalDepositedUsdt: 0.1,
      averageDepositUsdt: 0.05,
    });
    mockPrisma.periodSettlementSnapshot.findUnique.mockResolvedValue(null);
    mockPrisma.periodSettlementSnapshot.upsert.mockResolvedValue({
      settlement_snapshot_id: 'snapshot-2',
      investment_period_id: 'period-1',
      ending_balance_usdt: new Prisma.Decimal('0.3'),
      total_deposits_usdt: new Prisma.Decimal('0.1'),
      gross_pnl_usdt: new Prisma.Decimal('0.2'),
      trader_fee_percent: 40,
      trader_fee_usdt: new Prisma.Decimal('0.08'),
      network_fees_json: { TRON: 0, TON: 0, BSC: 0 },
      net_distributable_usdt: new Prisma.Decimal('0.22'),
      calculated_at: new Date('2026-04-04T00:00:00.000Z'),
      approved_at: new Date('2026-04-04T00:00:00.000Z'),
      approved_by: 'admin-1',
    });

    const preview = await service.preview('period-1', {
      ending_balance_usdt: 0.3,
      tron_network_fee_usdt: 0,
      ton_network_fee_usdt: 0,
      bsc_network_fee_usdt: 0,
    });

    await expect(
      service.approve('period-1', {
        ending_balance_usdt: 0.3,
        tron_network_fee_usdt: 0,
        ton_network_fee_usdt: 0,
        bsc_network_fee_usdt: 0,
        preview_signature: preview.preview_signature,
      } as any, 'admin-1'),
    ).resolves.toEqual({
      settlement_snapshot_id: 'snapshot-2',
      investment_period_id: 'period-1',
      totalDepositsUsdt: 0.1,
      endingBalanceUsdt: 0.3,
      grossPnlUsdt: 0.2,
      traderFeePercent: 40,
      traderFeeUsdt: 0.08,
      netDistributableUsdt: 0.22,
      networkFeesUsdt: { TRON: 0, TON: 0, BSC: 0 },
      calculated_at: '2026-04-04T00:00:00.000Z',
      approved_at: '2026-04-04T00:00:00.000Z',
      approved_by: 'admin-1',
    });

    const fractionalCreate = mockPrisma.periodSettlementSnapshot.upsert.mock.calls[0][0].create;
    expect(fractionalCreate.ending_balance_usdt.toString()).toBe('0.3');
    expect(fractionalCreate.total_deposits_usdt.toString()).toBe('0.1');
    expect(fractionalCreate.gross_pnl_usdt.toString()).toBe('0.2');
    expect(fractionalCreate.trader_fee_usdt.toString()).toBe('0.08');
    expect(fractionalCreate.net_distributable_usdt.toString()).toBe('0.22');
  });

  it('rejects invalid optional fee inputs instead of silently defaulting', async () => {
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      status: 'REPORTING',
    });
    mockAnalytics.getSummary.mockResolvedValue({
      depositCount: 1,
      totalDepositedUsdt: 100,
      averageDepositUsdt: 100,
    });

    await expect(
      service.preview('period-1', {
        ending_balance_usdt: 150,
        tron_network_fee_usdt: NaN as any,
      }),
    ).rejects.toThrow('tron_network_fee_usdt must be a valid number');
  });

  it('rejects blank string numeric inputs at the DTO boundary', async () => {
    const dto = plainToInstance(PeriodSettlementInputDto, {
      ending_balance_usdt: '',
      trader_fee_percent: '',
      tron_network_fee_usdt: '',
    });
    const errors = validateSync(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['ending_balance_usdt', 'trader_fee_percent', 'tron_network_fee_usdt']),
    );
  });
});
