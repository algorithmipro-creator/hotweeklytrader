import { Test } from '@nestjs/testing';
import { AdminPeriodsController } from './admin-periods.controller';
import { PeriodsService } from './periods.service';

describe('AdminPeriodsController', () => {
  it('exposes canonical trader reporting for a selected period', async () => {
    const periodsService = {
      getCanonicalPeriodReporting: jest.fn().mockResolvedValue({
        period: { investment_period_id: 'period-1' },
        readiness: { ready: false, blockers: ['required_reports_not_published'] },
        traders: [],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AdminPeriodsController],
      providers: [
        { provide: PeriodsService, useValue: periodsService },
      ],
    }).compile();

    const controller = moduleRef.get(AdminPeriodsController);
    const result = await controller.getCanonicalTraderReporting('period-1');

    expect(periodsService.getCanonicalPeriodReporting).toHaveBeenCalledWith('period-1');
    expect(result).toEqual(
      expect.objectContaining({
        period: expect.objectContaining({ investment_period_id: 'period-1' }),
        traders: expect.any(Array),
      }),
    );
  });
});
