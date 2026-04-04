import { Test } from '@nestjs/testing';
import { PeriodAnalyticsService } from './period-analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('PeriodAnalyticsService', () => {
  let service: PeriodAnalyticsService;

  const mockPrisma = {
    deposit: {
      aggregate: jest.fn(),
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
    mockPrisma.deposit.aggregate.mockResolvedValue({
      _count: { deposit_id: 2, confirmed_amount: 2 },
      _sum: { confirmed_amount: new Prisma.Decimal('300') },
    });

    await expect(service.getSummary('period-1')).resolves.toEqual({
      depositCount: 2,
      totalDepositedUsdt: 300,
      averageDepositUsdt: 150,
    });
  });

  it('returns zeros when there are no deposits', async () => {
    mockPrisma.deposit.aggregate.mockResolvedValue({
      _count: { deposit_id: 0, confirmed_amount: 0 },
      _sum: { confirmed_amount: null },
    });

    await expect(service.getSummary('period-1')).resolves.toEqual({
      depositCount: 0,
      totalDepositedUsdt: 0,
      averageDepositUsdt: 0,
    });
  });

  it('does not average in deposits without confirmed amounts', async () => {
    mockPrisma.deposit.aggregate.mockResolvedValue({
      _count: { deposit_id: 3, confirmed_amount: 2 },
      _sum: { confirmed_amount: new Prisma.Decimal('300') },
    });

    await expect(service.getSummary('period-1')).resolves.toEqual({
      depositCount: 3,
      totalDepositedUsdt: 300,
      averageDepositUsdt: 150,
    });
  });
});
