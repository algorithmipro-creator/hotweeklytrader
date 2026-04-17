import { Test } from '@nestjs/testing';
import { LiveMetricsService } from './live-metrics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('LiveMetricsService', () => {
  let service: LiveMetricsService;

  const mockPrisma = {
    traderPeriodLiveMetrics: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    deposit: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LiveMetricsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(LiveMetricsService);
    jest.clearAllMocks();
  });

  it('upserts one snapshot per trader and investment period', async () => {
    mockPrisma.traderPeriodLiveMetrics.upsert.mockResolvedValue({
      trader_period_live_metrics_id: 'metrics-1',
      trader_id: 'trader-1',
      investment_period_id: 'period-1',
      source_type: 'MT5',
      profit_percent: '12.50',
      trade_count: 14,
      win_rate: '71.43',
      captured_at: new Date('2026-04-17T12:00:00.000Z'),
      raw_payload: { account: 1001 },
    });

    const result = await service.upsertSnapshot({
      trader_id: 'trader-1',
      investment_period_id: 'period-1',
      source_type: 'MT5',
      profit_percent: '12.50',
      trade_count: 14,
      win_rate: '71.43',
      captured_at: '2026-04-17T12:00:00.000Z',
      raw_payload: { account: 1001 },
    });

    expect(mockPrisma.traderPeriodLiveMetrics.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          trader_id_investment_period_id: {
            trader_id: 'trader-1',
            investment_period_id: 'period-1',
          },
        },
      }),
    );
    expect(result.trader_id).toBe('trader-1');
  });

  it('returns live metrics for a deposit by resolving trader and period', async () => {
    mockPrisma.deposit.findUnique.mockResolvedValue({
      deposit_id: 'dep-1',
      trader_id: 'trader-1',
      investment_period_id: 'period-1',
    });
    mockPrisma.traderPeriodLiveMetrics.findUnique.mockResolvedValue({
      trader_id: 'trader-1',
      investment_period_id: 'period-1',
      source_type: 'MT5',
      profit_percent: '8.75',
      trade_count: 9,
      win_rate: '66.67',
      captured_at: new Date('2026-04-17T13:00:00.000Z'),
      raw_payload: null,
    });

    const result = await service.getSnapshotForDeposit('dep-1');

    expect(mockPrisma.deposit.findUnique).toHaveBeenCalledWith({
      where: { deposit_id: 'dep-1' },
      select: { deposit_id: true, trader_id: true, investment_period_id: true },
    });
    expect(result?.profit_percent).toBe('8.75');
  });
});
