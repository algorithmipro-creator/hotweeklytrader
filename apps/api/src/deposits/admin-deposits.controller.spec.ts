import { Test } from '@nestjs/testing';
import { AdminDepositsController } from './admin-deposits.controller';
import { DepositsService } from './deposits.service';

describe('AdminDepositsController', () => {
  let controller: AdminDepositsController;

  const mockPrisma = {
    deposit: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockDepositsService = {
    prisma: mockPrisma,
    findOne: jest.fn(),
    transition: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminDepositsController],
      providers: [
        { provide: DepositsService, useValue: mockDepositsService },
      ],
    }).compile();

    controller = module.get(AdminDepositsController);
    jest.clearAllMocks();
  });

  it('forwards the investment_period_id filter and exposes period metadata', async () => {
    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'dep-1',
        investment_period_id: 'period-1',
        network: 'TON',
        asset_symbol: 'USDT',
        requested_amount: null,
        confirmed_amount: null,
        created_at: new Date('2026-04-01T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        route_expires_at: null,
        investment_period: {
          title: 'Funding Period',
          status: 'FUNDING',
          investment_period_id: 'period-1',
        },
      },
    ]);

    await expect(controller.findAll(undefined, undefined, 'period-1', undefined, undefined)).resolves.toEqual([
      expect.objectContaining({
        investment_period_title: 'Funding Period',
        investment_period_status: 'FUNDING',
      }),
    ]);

    expect(mockPrisma.deposit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { investment_period_id: 'period-1' },
      }),
    );
  });
});
