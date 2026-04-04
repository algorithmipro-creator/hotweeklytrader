import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PeriodPayoutRegistryService } from './period-payout-registry.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PeriodPayoutRegistryService', () => {
  let service: PeriodPayoutRegistryService;

  const mockPrisma: any = {
    investmentPeriod: {
      findUnique: jest.fn(),
    },
    periodPayoutRegistry: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    deposit: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PeriodPayoutRegistryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(PeriodPayoutRegistryService);
    jest.clearAllMocks();
  });

  it('generates a registry from an approved settlement snapshot with network-specific fee allocation', async () => {
    const snapshot = {
      settlement_snapshot_id: 'snapshot-1',
      total_deposits_usdt: new Prisma.Decimal('1000'),
      net_distributable_usdt: new Prisma.Decimal('850'),
      network_fees_json: { TRON: 10, TON: 20, BSC: 30 },
      approved_at: new Date('2026-04-04T00:00:00.000Z'),
    };

    mockPrisma.periodPayoutRegistry.findUnique.mockResolvedValue(null);
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      settlement_snapshot: snapshot,
    });
    mockPrisma.deposit.findMany.mockResolvedValue([
      { deposit_id: 'deposit-1', network: 'TRON', asset_symbol: 'USDT', confirmed_amount: new Prisma.Decimal('400') },
      { deposit_id: 'deposit-2', network: 'TRON', asset_symbol: 'USDT', confirmed_amount: new Prisma.Decimal('100') },
      { deposit_id: 'deposit-3', network: 'TON', asset_symbol: 'USDT', confirmed_amount: new Prisma.Decimal('300') },
      { deposit_id: 'deposit-4', network: 'BSC', asset_symbol: 'USDT', confirmed_amount: new Prisma.Decimal('200') },
    ]);
    mockPrisma.periodPayoutRegistry.create.mockResolvedValue({
      payout_registry_id: 'registry-1',
      investment_period_id: 'period-1',
      settlement_snapshot_id: 'snapshot-1',
      generated_at: new Date('2026-04-04T00:00:00.000Z'),
      generated_by: 'admin-1',
      settlement_snapshot: snapshot,
      items: [
        {
          payout_registry_item_id: 'item-1',
          deposit_id: 'deposit-1',
          network: 'TRON',
          asset_symbol: 'USDT',
          confirmed_amount_usdt: new Prisma.Decimal('400'),
          network_fee_bucket_usdt: new Prisma.Decimal('10'),
          network_fee_allocation_usdt: new Prisma.Decimal('8'),
          payout_amount_usdt: new Prisma.Decimal('340'),
          created_at: new Date('2026-04-04T00:00:00.000Z'),
        },
        {
          payout_registry_item_id: 'item-2',
          deposit_id: 'deposit-2',
          network: 'TRON',
          asset_symbol: 'USDT',
          confirmed_amount_usdt: new Prisma.Decimal('100'),
          network_fee_bucket_usdt: new Prisma.Decimal('10'),
          network_fee_allocation_usdt: new Prisma.Decimal('2'),
          payout_amount_usdt: new Prisma.Decimal('85'),
          created_at: new Date('2026-04-04T00:00:00.000Z'),
        },
        {
          payout_registry_item_id: 'item-3',
          deposit_id: 'deposit-3',
          network: 'TON',
          asset_symbol: 'USDT',
          confirmed_amount_usdt: new Prisma.Decimal('300'),
          network_fee_bucket_usdt: new Prisma.Decimal('20'),
          network_fee_allocation_usdt: new Prisma.Decimal('20'),
          payout_amount_usdt: new Prisma.Decimal('255'),
          created_at: new Date('2026-04-04T00:00:00.000Z'),
        },
        {
          payout_registry_item_id: 'item-4',
          deposit_id: 'deposit-4',
          network: 'BSC',
          asset_symbol: 'USDT',
          confirmed_amount_usdt: new Prisma.Decimal('200'),
          network_fee_bucket_usdt: new Prisma.Decimal('30'),
          network_fee_allocation_usdt: new Prisma.Decimal('30'),
          payout_amount_usdt: new Prisma.Decimal('170'),
          created_at: new Date('2026-04-04T00:00:00.000Z'),
        },
      ],
    });

    await expect(service.generate('period-1', 'admin-1')).resolves.toEqual({
      payout_registry_id: 'registry-1',
      investment_period_id: 'period-1',
      settlement_snapshot_id: 'snapshot-1',
      generated_at: '2026-04-04T00:00:00.000Z',
      generated_by: 'admin-1',
      totalDepositsUsdt: 1000,
      netDistributableUsdt: 850,
      networkFeesUsdt: { TRON: 10, TON: 20, BSC: 30 },
      items: expect.arrayContaining([
        expect.objectContaining({ deposit_id: 'deposit-1', network_fee_allocation_usdt: 8, payout_amount_usdt: 340 }),
        expect.objectContaining({ deposit_id: 'deposit-2', network_fee_allocation_usdt: 2, payout_amount_usdt: 85 }),
        expect.objectContaining({ deposit_id: 'deposit-3', network_fee_allocation_usdt: 20, payout_amount_usdt: 255 }),
        expect.objectContaining({ deposit_id: 'deposit-4', network_fee_allocation_usdt: 30, payout_amount_usdt: 170 }),
      ]),
    });

    const createArgs = mockPrisma.periodPayoutRegistry.create.mock.calls[0][0].data;
    const createdByDeposit = Object.fromEntries(
      createArgs.items.create.map((item: any) => [item.deposit_id, item]),
    );
    expect(createArgs.investment_period_id).toBe('period-1');
    expect(createArgs.settlement_snapshot_id).toBe('snapshot-1');
    expect(createArgs.generated_by).toBe('admin-1');
    expect(createdByDeposit['deposit-1'].confirmed_amount_usdt.toString()).toBe('400');
    expect(createdByDeposit['deposit-1'].network_fee_allocation_usdt.toString()).toBe('8');
    expect(createdByDeposit['deposit-4'].payout_amount_usdt.toString()).toBe('170');
  });

  it('returns an existing registry without rewriting it', async () => {
    mockPrisma.periodPayoutRegistry.findUnique.mockResolvedValue({
      payout_registry_id: 'registry-1',
      investment_period_id: 'period-1',
      settlement_snapshot_id: 'snapshot-1',
      generated_at: new Date('2026-04-04T00:00:00.000Z'),
      generated_by: 'admin-1',
      settlement_snapshot: {
        total_deposits_usdt: new Prisma.Decimal('1000'),
        net_distributable_usdt: new Prisma.Decimal('850'),
        network_fees_json: { TRON: 10, TON: 20, BSC: 30 },
      },
      items: [],
    });

    await expect(service.generate('period-1', 'admin-1')).resolves.toEqual({
      payout_registry_id: 'registry-1',
      investment_period_id: 'period-1',
      settlement_snapshot_id: 'snapshot-1',
      generated_at: '2026-04-04T00:00:00.000Z',
      generated_by: 'admin-1',
      totalDepositsUsdt: 1000,
      netDistributableUsdt: 850,
      networkFeesUsdt: { TRON: 10, TON: 20, BSC: 30 },
      items: [],
    });

    expect(mockPrisma.periodPayoutRegistry.create).not.toHaveBeenCalled();
  });

  it('requires an approved settlement snapshot before generating a registry', async () => {
    mockPrisma.periodPayoutRegistry.findUnique.mockResolvedValue(null);
    mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
      investment_period_id: 'period-1',
      settlement_snapshot: {
        settlement_snapshot_id: 'snapshot-1',
        approved_at: null,
        total_deposits_usdt: new Prisma.Decimal('1000'),
        net_distributable_usdt: new Prisma.Decimal('850'),
        network_fees_json: { TRON: 10, TON: 20, BSC: 30 },
      },
    });

    await expect(service.generate('period-1', 'admin-1')).rejects.toThrow(
      'An approved settlement snapshot is required before generating a payout registry',
    );
  });
});
