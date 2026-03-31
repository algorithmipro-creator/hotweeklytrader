import { Test } from '@nestjs/testing';
import { PayoutsService } from './payouts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('PayoutsService', () => {
  let service: PayoutsService;

  const mockPrisma = {
    payout: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    deposit: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    profitLossReport: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PayoutsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(PayoutsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('prepareForDeposit', () => {
    it('should throw if deposit not found', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(null);
      await expect(service.prepareForDeposit('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if report not approved', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue({ deposit_id: 'd1', status: 'REPORT_READY' });
      mockPrisma.profitLossReport.findUnique.mockResolvedValue(null);
      await expect(service.prepareForDeposit('d1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
