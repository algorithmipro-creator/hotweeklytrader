import { Test } from '@nestjs/testing';
import { DepositsService } from './deposits.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DepositsService', () => {
  let service: DepositsService;

  const mockPrisma = {
    deposit: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    investmentPeriod: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(DepositsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUser', () => {
    it('should return deposits for a user', async () => {
      mockPrisma.deposit.findMany.mockResolvedValue([]);

      const result = await service.findByUser('user-1');
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.deposit.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw if deposit not found', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });
});
