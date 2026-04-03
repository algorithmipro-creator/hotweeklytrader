import { Test } from '@nestjs/testing';
import { PeriodCompletionJob } from './period-completion.job';
import { PrismaService } from '../../prisma/prisma.service';

describe('PeriodCompletionJob', () => {
  let job: PeriodCompletionJob;

  const mockPrisma = {
    investmentPeriod: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PeriodCompletionJob,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    job = module.get(PeriodCompletionJob);
    jest.clearAllMocks();
  });

  it('advances ended TRADING_ACTIVE periods to REPORTING', async () => {
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      status: 'TRADING_ACTIVE',
      end_date: new Date('2026-04-01T00:00:00.000Z'),
    });
    mockPrisma.investmentPeriod.update.mockResolvedValue({});

    await job.execute('period-1');

    expect(mockPrisma.investmentPeriod.update).toHaveBeenCalledWith({
      where: { investment_period_id: 'period-1' },
      data: { status: 'REPORTING' },
    });
  });

  it('does nothing for non-ended periods', async () => {
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      status: 'TRADING_ACTIVE',
      end_date: new Date('2999-01-01T00:00:00.000Z'),
    });

    await job.execute('period-1');

    expect(mockPrisma.investmentPeriod.update).not.toHaveBeenCalled();
  });

  it('does nothing for ended non-TRADING_ACTIVE periods', async () => {
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      status: 'FUNDING',
      end_date: new Date('2026-04-01T00:00:00.000Z'),
    });

    await job.execute('period-1');

    expect(mockPrisma.investmentPeriod.update).not.toHaveBeenCalled();
  });
});
