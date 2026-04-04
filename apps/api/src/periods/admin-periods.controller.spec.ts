import { Test } from '@nestjs/testing';
import { AdminPeriodsController } from './admin-periods.controller';
import { PeriodsService } from './periods.service';
import { PeriodAnalyticsService } from './period-analytics.service';

describe('AdminPeriodsController', () => {
  let controller: AdminPeriodsController;

  const mockPeriodsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockAnalyticsService = {
    getSummaries: jest.fn(),
    getSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminPeriodsController],
      providers: [
        { provide: PeriodsService, useValue: mockPeriodsService },
        { provide: PeriodAnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    controller = module.get(AdminPeriodsController);
    jest.clearAllMocks();
  });

  it('enriches list periods with batched summaries', async () => {
    mockPeriodsService.findAll.mockResolvedValue([
      { investment_period_id: 'period-1', title: 'P1' },
      { investment_period_id: 'period-2', title: 'P2' },
    ]);
    mockAnalyticsService.getSummaries.mockResolvedValue({
      'period-1': { depositCount: 2, totalDepositedUsdt: 300, averageDepositUsdt: 150 },
      'period-2': { depositCount: 1, totalDepositedUsdt: 50, averageDepositUsdt: 50 },
    });

    await expect(controller.findAll()).resolves.toEqual([
      { investment_period_id: 'period-1', title: 'P1', depositCount: 2, totalDepositedUsdt: 300, averageDepositUsdt: 150 },
      { investment_period_id: 'period-2', title: 'P2', depositCount: 1, totalDepositedUsdt: 50, averageDepositUsdt: 50 },
    ]);

    expect(mockPeriodsService.findAll).toHaveBeenCalledWith('ALL');
    expect(mockAnalyticsService.getSummaries).toHaveBeenCalledWith(['period-1', 'period-2']);
  });

  it('enriches the detail view with a summary', async () => {
    mockPeriodsService.findOne.mockResolvedValue({ investment_period_id: 'period-1', title: 'P1' });
    mockAnalyticsService.getSummary.mockResolvedValue({
      depositCount: 2,
      totalDepositedUsdt: 300,
      averageDepositUsdt: 150,
    });

    await expect(controller.findOne('period-1')).resolves.toEqual({
      investment_period_id: 'period-1',
      title: 'P1',
      depositCount: 2,
      totalDepositedUsdt: 300,
      averageDepositUsdt: 150,
    });
  });
});
