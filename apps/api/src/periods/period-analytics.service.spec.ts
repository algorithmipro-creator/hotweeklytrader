import { Test } from '@nestjs/testing';
import { COUNTABLE_CONFIRMED_USDT_STATUSES, PeriodAnalyticsService } from './period-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('PeriodAnalyticsService', () => {
  let service: PeriodAnalyticsService;

  const mockPrisma = {
    deposit: {
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PeriodAnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PeriodAnalyticsService);
    jest.clearAllMocks();
  });

  it('returns deposit count, total, and average for a period', async () => {
    mockPrisma.deposit.groupBy.mockResolvedValue([
      {
        investment_period_id: 'period-1',
        _count: { deposit_id: 2 },
        _sum: { confirmed_amount: new Prisma.Decimal('300') },
      },
    ]);

    await expect(service.getSummary('period-1')).resolves.toEqual({
      depositCount: 2,
      totalDepositedUsdt: new Prisma.Decimal('300'),
      averageDepositUsdt: new Prisma.Decimal('150'),
    });

    expect(mockPrisma.deposit.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          investment_period_id: { in: ['period-1'] },
          asset_symbol: 'USDT',
          confirmed_amount: { not: null },
          confirmed_at: { not: null },
          status: { in: COUNTABLE_CONFIRMED_USDT_STATUSES },
        }),
      }),
    );
  });

  it('returns zeros when there are no deposits', async () => {
    mockPrisma.deposit.groupBy.mockResolvedValue([]);

    await expect(service.getSummary('period-1')).resolves.toEqual({
      depositCount: 0,
      totalDepositedUsdt: new Prisma.Decimal('0'),
      averageDepositUsdt: new Prisma.Decimal('0'),
    });
  });

  it('does not average in deposits without confirmed amounts', async () => {
    mockPrisma.deposit.groupBy.mockResolvedValue([
      {
        investment_period_id: 'period-1',
        _count: { deposit_id: 2 },
        _sum: { confirmed_amount: new Prisma.Decimal('300') },
      },
    ]);

    await expect(service.getSummary('period-1')).resolves.toEqual({
      depositCount: 2,
      totalDepositedUsdt: new Prisma.Decimal('300'),
      averageDepositUsdt: new Prisma.Decimal('150'),
    });
  });

  it('keeps manually reviewed confirmed deposits in the confirmed-only predicate', async () => {
    mockPrisma.deposit.groupBy.mockResolvedValue([
      {
        investment_period_id: 'period-1',
        _count: { deposit_id: 1 },
        _sum: { confirmed_amount: new Prisma.Decimal('120') },
      },
    ]);

    await expect(service.getSummary('period-1')).resolves.toEqual({
      depositCount: 1,
      totalDepositedUsdt: new Prisma.Decimal('120'),
      averageDepositUsdt: new Prisma.Decimal('120'),
    });

    expect(mockPrisma.deposit.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          asset_symbol: 'USDT',
          confirmed_at: { not: null },
          status: { in: COUNTABLE_CONFIRMED_USDT_STATUSES },
        }),
      }),
    );
  });

  it('excludes rejected or cancelled deposits from period summaries', async () => {
    mockPrisma.deposit.groupBy.mockResolvedValue([]);

    await service.getSummary('period-1');

    const [args] = mockPrisma.deposit.groupBy.mock.calls[0];
    expect(args.where).toEqual(
      expect.objectContaining({
        investment_period_id: { in: ['period-1'] },
        asset_symbol: 'USDT',
        confirmed_amount: { not: null },
        confirmed_at: { not: null },
        status: { in: COUNTABLE_CONFIRMED_USDT_STATUSES },
      }),
    );
    expect(args.where.status.in).not.toContain('REJECTED');
    expect(args.where.status.in).not.toContain('CANCELLED');
  });
});
