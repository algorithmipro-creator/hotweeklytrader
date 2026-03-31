import { Test } from '@nestjs/testing';
import { PeriodsService } from './periods.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PeriodsService', () => {
  let service: PeriodsService;

  const mockPrisma = {
    investmentPeriod: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PeriodsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(PeriodsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return active periods by default', async () => {
      mockPrisma.investmentPeriod.findMany.mockResolvedValue([]);

      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.investmentPeriod.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE' },
        orderBy: { start_date: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw if period not found', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
