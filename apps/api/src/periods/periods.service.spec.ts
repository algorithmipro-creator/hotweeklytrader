import { Test } from '@nestjs/testing';
import { PeriodsService } from './periods.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

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

  const basePeriod = {
    investment_period_id: 'period-1',
    title: 'Quarter 1',
    period_type: 'SEASONAL',
    start_date: new Date('2026-04-01T00:00:00.000Z'),
    end_date: new Date('2026-05-01T00:00:00.000Z'),
    lock_date: null,
    status: 'FUNDING',
    accepted_networks: ['TON'],
    accepted_assets: ['USDT'],
    minimum_amount_rules: null,
    maximum_amount_rules: null,
    created_by: 'admin-1',
    created_at: new Date('2026-04-01T00:00:00.000Z'),
    updated_at: new Date('2026-04-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PeriodsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PeriodsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return trading-active periods by default', async () => {
      mockPrisma.investmentPeriod.findMany.mockResolvedValue([]);

      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(mockPrisma.investmentPeriod.findMany).toHaveBeenCalledWith({
        where: { status: 'TRADING_ACTIVE' },
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

  describe('create', () => {
    it('creates periods in FUNDING status by default', async () => {
      mockPrisma.investmentPeriod.create.mockResolvedValue(basePeriod);

      await service.create({
        title: 'Quarter 1',
        period_type: 'SEASONAL',
        start_date: '2026-04-01T00:00:00.000Z',
        end_date: '2026-05-01T00:00:00.000Z',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });

      expect(mockPrisma.investmentPeriod.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FUNDING',
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('allows only forward transitions', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(basePeriod);
      mockPrisma.investmentPeriod.update.mockResolvedValue({
        ...basePeriod,
        status: 'TRADING_ACTIVE',
      });

      await expect(service.updateStatus('period-1', 'TRADING_ACTIVE')).resolves.toMatchObject({
        status: 'TRADING_ACTIVE',
      });

      expect(mockPrisma.investmentPeriod.update).toHaveBeenCalledWith({
        where: { investment_period_id: 'period-1' },
        data: { status: 'TRADING_ACTIVE' },
      });
    });

    it('rejects backward transitions', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        ...basePeriod,
        status: 'TRADING_ACTIVE',
      });

      await expect(service.updateStatus('period-1', 'FUNDING')).rejects.toThrow(BadRequestException);
    });
  });
});
