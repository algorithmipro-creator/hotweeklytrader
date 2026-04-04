import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AdminPeriodsController } from './admin-periods.controller';
import { PeriodsService } from './periods.service';
import { PeriodAnalyticsService } from './period-analytics.service';
import { PeriodSettlementService } from './period-settlement.service';
import { PeriodPayoutRegistryService } from './period-payout-registry.service';
import { ApprovePeriodSettlementDto } from './dto/period.dto';

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

  const mockSettlementService = {
    getSnapshot: jest.fn(),
    preview: jest.fn(),
    approve: jest.fn(),
  };

  const mockPayoutRegistryService = {
    getRegistry: jest.fn(),
    generate: jest.fn(),
  };

  beforeEach(async () => {
    mockSettlementService.getSnapshot.mockResolvedValue(null);
    const module = await Test.createTestingModule({
      controllers: [AdminPeriodsController],
      providers: [
        { provide: PeriodsService, useValue: mockPeriodsService },
        { provide: PeriodAnalyticsService, useValue: mockAnalyticsService },
        { provide: PeriodSettlementService, useValue: mockSettlementService },
        { provide: PeriodPayoutRegistryService, useValue: mockPayoutRegistryService },
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
      settlement_snapshot: null,
    });
  });

  it('proxies settlement preview and approval with the current user', async () => {
    mockSettlementService.preview.mockResolvedValue({
      investment_period_id: 'period-1',
      totalDepositsUsdt: 300,
      endingBalanceUsdt: 350,
      grossPnlUsdt: 50,
      traderFeePercent: 40,
      traderFeeUsdt: 20,
      netDistributableUsdt: 330,
      networkFeesUsdt: { TRON: 0, TON: 0, BSC: 0 },
      preview_signature: 'sig-1',
    });
    mockSettlementService.approve.mockResolvedValue({
      investment_period_id: 'period-1',
      settlement_snapshot_id: 'snapshot-1',
      totalDepositsUsdt: 300,
      endingBalanceUsdt: 350,
      grossPnlUsdt: 50,
      traderFeePercent: 40,
      traderFeeUsdt: 20,
      netDistributableUsdt: 330,
      networkFeesUsdt: { TRON: 0, TON: 0, BSC: 0 },
      calculated_at: '2026-04-04T00:00:00.000Z',
      approved_at: '2026-04-04T00:00:00.000Z',
      approved_by: 'admin-1',
    });

    await expect(
      controller.previewSettlement('period-1', {
        ending_balance_usdt: 350,
        trader_fee_percent: 40,
      } as any),
    ).resolves.toEqual({
      investment_period_id: 'period-1',
      totalDepositsUsdt: 300,
      endingBalanceUsdt: 350,
      grossPnlUsdt: 50,
      traderFeePercent: 40,
      traderFeeUsdt: 20,
      netDistributableUsdt: 330,
      networkFeesUsdt: { TRON: 0, TON: 0, BSC: 0 },
      preview_signature: 'sig-1',
    });

    await expect(
      controller.approveSettlement('period-1', {
        ending_balance_usdt: 350,
        trader_fee_percent: 40,
        preview_signature: 'sig-1',
      } as any, { user_id: 'admin-1' }),
    ).resolves.toEqual({
      investment_period_id: 'period-1',
      settlement_snapshot_id: 'snapshot-1',
      totalDepositsUsdt: 300,
      endingBalanceUsdt: 350,
      grossPnlUsdt: 50,
      traderFeePercent: 40,
      traderFeeUsdt: 20,
      netDistributableUsdt: 330,
      networkFeesUsdt: { TRON: 0, TON: 0, BSC: 0 },
      calculated_at: '2026-04-04T00:00:00.000Z',
      approved_at: '2026-04-04T00:00:00.000Z',
      approved_by: 'admin-1',
    });

    expect(mockSettlementService.preview).toHaveBeenCalledWith('period-1', expect.objectContaining({
      ending_balance_usdt: 350,
      trader_fee_percent: 40,
    }));
    expect(Object.prototype.hasOwnProperty.call(mockSettlementService.preview.mock.calls[0][1], 'preview_signature')).toBe(false);
    expect(mockSettlementService.approve).toHaveBeenCalledWith('period-1', expect.objectContaining({
      ending_balance_usdt: 350,
      trader_fee_percent: 40,
      preview_signature: 'sig-1',
    }), 'admin-1');
  });

  it('requires a preview signature on approve payloads', async () => {
    const dto = plainToInstance(ApprovePeriodSettlementDto, {
      ending_balance_usdt: 350,
      trader_fee_percent: 40,
    });
    const errors = validateSync(dto);
    expect(errors.map((error) => error.property)).toContain('preview_signature');
  });

  it('proxies payout registry generation and fetching with the current user', async () => {
    mockPayoutRegistryService.getRegistry.mockResolvedValue({
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
    mockPayoutRegistryService.generate.mockResolvedValue({
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

    await expect(controller.getPayoutRegistry('period-1')).resolves.toEqual({
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

    await expect(controller.generatePayoutRegistry('period-1', { user_id: 'admin-1' })).resolves.toEqual({
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

    expect(mockPayoutRegistryService.getRegistry).toHaveBeenCalledWith('period-1');
    expect(mockPayoutRegistryService.generate).toHaveBeenCalledWith('period-1', 'admin-1');
  });
});
