import { Test } from '@nestjs/testing';
import { AdminDashboardController } from './admin-dashboard.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminDashboardController', () => {
  let controller: AdminDashboardController;

  const mockPrisma = {
    deposit: { count: jest.fn() },
    payout: { count: jest.fn() },
    profitLossReport: { count: jest.fn() },
    user: { count: jest.fn() },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    controller = module.get(AdminDashboardController);
    jest.clearAllMocks();
  });

  it('returns real dashboard counters instead of list lengths', async () => {
    mockPrisma.deposit.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2);
    mockPrisma.payout.count.mockResolvedValue(3);
    mockPrisma.profitLossReport.count.mockResolvedValue(1);
    mockPrisma.user.count.mockResolvedValue(9);

    await expect(controller.getStats()).resolves.toEqual({
      activeDeposits: 4,
      pendingReview: 2,
      pendingPayouts: 3,
      pendingReports: 1,
      totalUsers: 9,
    });
  });
});
