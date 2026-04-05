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

  const withLifecycleRelations = (overrides: any = {}) => ({
    ...basePeriod,
    ...overrides,
    settlement_snapshot: overrides.settlement_snapshot ?? null,
    payout_registry: overrides.payout_registry ?? null,
  });

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

    it('should return all periods for the admin sentinel', async () => {
      mockPrisma.investmentPeriod.findMany.mockResolvedValue([]);

      await service.findAll('ALL');

      expect(mockPrisma.investmentPeriod.findMany).toHaveBeenCalledWith({
        where: undefined,
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

  describe('update', () => {
    it('does not write when dto.status matches the current status', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(withLifecycleRelations());

      await expect(service.update('period-1', { status: 'FUNDING' } as any)).resolves.toMatchObject({
        status: 'FUNDING',
      });

      expect(mockPrisma.investmentPeriod.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('returns existing period without writing when status is unchanged', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(withLifecycleRelations());

      await expect(service.updateStatus('period-1', 'FUNDING')).resolves.toMatchObject({
        status: 'FUNDING',
      });

      expect(mockPrisma.investmentPeriod.update).not.toHaveBeenCalled();
    });

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
        ...withLifecycleRelations(),
        status: 'TRADING_ACTIVE',
      });

      await expect(service.updateStatus('period-1', 'FUNDING')).rejects.toThrow(BadRequestException);
    });

    it('requires an approved settlement snapshot before opening payouts', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(
        withLifecycleRelations({
          status: 'REPORTING',
          settlement_snapshot: null,
        }),
      );

      await expect(service.updateStatus('period-1', 'PAYOUT_IN_PROGRESS')).rejects.toThrow(
        'An approved settlement snapshot is required before opening payouts',
      );
      expect(mockPrisma.investmentPeriod.update).not.toHaveBeenCalled();
    });

    it('allows closing only when payout registry items are resolved', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(
        withLifecycleRelations({
          status: 'PAYOUT_IN_PROGRESS',
          settlement_snapshot: {
            approved_at: new Date('2026-04-04T00:00:00.000Z'),
          },
          payout_registry: {
            payout_registry_id: 'registry-1',
            items: [
              { status: 'CONFIRMED' },
              { status: 'FAILED' },
              { status: 'CANCELLED' },
            ],
          },
        }),
      );
      mockPrisma.investmentPeriod.update.mockResolvedValue({
        ...basePeriod,
        status: 'CLOSED',
      });

      await expect(service.updateStatus('period-1', 'CLOSED')).resolves.toMatchObject({
        status: 'CLOSED',
      });

      expect(mockPrisma.investmentPeriod.update).toHaveBeenCalledWith({
        where: { investment_period_id: 'period-1' },
        data: { status: 'CLOSED' },
      });
    });

    it('rejects closing when payout registry items remain unresolved', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(
        withLifecycleRelations({
          status: 'PAYOUT_IN_PROGRESS',
          settlement_snapshot: {
            approved_at: new Date('2026-04-04T00:00:00.000Z'),
          },
          payout_registry: {
            payout_registry_id: 'registry-1',
            items: [
              { status: 'APPROVED' },
              { status: 'CONFIRMED' },
            ],
          },
        }),
      );

      await expect(service.updateStatus('period-1', 'CLOSED')).rejects.toThrow(
        'All payout registry items must be resolved before closing the period',
      );
      expect(mockPrisma.investmentPeriod.update).not.toHaveBeenCalled();
    });

    it('rejects closing when no payout registry exists yet', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(
        withLifecycleRelations({
          status: 'PAYOUT_IN_PROGRESS',
          settlement_snapshot: {
            approved_at: new Date('2026-04-04T00:00:00.000Z'),
          },
          payout_registry: null,
        }),
      );

      await expect(service.updateStatus('period-1', 'CLOSED')).rejects.toThrow(
        'A payout registry must exist before closing the period',
      );
      expect(mockPrisma.investmentPeriod.update).not.toHaveBeenCalled();
    });
  });

  describe('update status guards', () => {
    it('rejects generic update to PAYOUT_IN_PROGRESS without an approved settlement snapshot', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue(
        withLifecycleRelations({
          status: 'REPORTING',
          settlement_snapshot: null,
        }),
      );

      await expect(service.update('period-1', { status: 'PAYOUT_IN_PROGRESS' } as any)).rejects.toThrow(
        'An approved settlement snapshot is required before opening payouts',
      );
      expect(mockPrisma.investmentPeriod.update).not.toHaveBeenCalled();
    });
  });
});
