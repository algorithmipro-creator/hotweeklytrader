import { Test } from '@nestjs/testing';
import { PeriodsService } from './periods.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReferralRewardsService } from '../referrals/referral-rewards.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PeriodsService', () => {
  let service: PeriodsService;

  const mockReferralRewardsService = {
    materializeRewardsForPublishedTraderReport: jest.fn(),
  };

  const mockPrisma = {
    investmentPeriod: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    profitLossReport: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    deposit: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    periodTraderReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    payoutRegistry: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    payoutRegistryRow: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PeriodsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReferralRewardsService, useValue: mockReferralRewardsService },
      ],
    }).compile();

    service = (module as any).get(PeriodsService);
    jest.clearAllMocks();
    mockReferralRewardsService.materializeRewardsForPublishedTraderReport.mockReset();
    mockPrisma.profitLossReport.findMany.mockReset();
    mockPrisma.profitLossReport.findMany.mockResolvedValue([]);
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

  describe('listTraderReports', () => {
    it('derives required trader reports from traders who have deposits in the selected period', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          trader_id: 'trader-1',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
        {
          trader_id: 'trader-2',
          trader: { trader_id: 'trader-2', nickname: 'beta', slug: 'beta', display_name: 'Beta' },
        },
        {
          trader_id: 'trader-1',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);
      mockPrisma.periodTraderReport.findMany.mockResolvedValue([
        {
          trader_report_id: 'report-1',
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          status: 'DRAFT',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);

      const reports = await (service as any).listTraderReports('period-1');

      expect(reports.map((report: any) => report.trader_id)).toEqual(['trader-1', 'trader-2']);
    });

    it('ignores deposits that have not reached settlement-eligible statuses', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          trader_id: 'trader-1',
          status: 'COMPLETED',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);
      mockPrisma.periodTraderReport.findMany.mockResolvedValue([]);

      const reports = await (service as any).listTraderReports('period-1');

      expect(reports.map((report: any) => report.trader_id)).toEqual(['trader-1']);
      expect(mockPrisma.deposit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            investment_period_id: 'period-1',
            trader_id: { not: null },
            status: {
              in: ['COMPLETED', 'REPORT_READY', 'PAYOUT_PENDING', 'PAYOUT_APPROVED', 'PAYOUT_SENT', 'PAYOUT_CONFIRMED'],
            },
          }),
        }),
      );
    });

    it('includes saved report values so admin can hydrate an existing trader report draft', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          trader_id: 'trader-1',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);
      mockPrisma.periodTraderReport.findMany.mockResolvedValue([
        {
          trader_report_id: 'report-1',
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          status: 'APPROVED',
          ending_balance_usdt: '1200',
          trader_fee_percent: '35',
          network_fees_json: { TRON: 5, TON: 1.25, BSC: 0 },
          generated_by: 'admin-1',
          approved_by: 'admin-2',
          approved_at: new Date('2026-04-06T10:10:00.000Z'),
          published_at: null,
          created_at: new Date('2026-04-06T10:00:00.000Z'),
          updated_at: new Date('2026-04-06T10:15:00.000Z'),
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);

      const [report] = await (service as any).listTraderReports('period-1');

      expect(report).toMatchObject({
        trader_report_id: 'report-1',
        status: 'APPROVED',
        ending_balance_usdt: 1200,
        trader_fee_percent: 35,
        network_fees_json: { TRON: 5, TON: 1.25, BSC: 0 },
      });
    });
  });

  describe('upsertTraderReportDraft', () => {
    it('creates or updates one immutable trader report record per period + trader pair', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          trader_id: 'trader-1',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);
      mockPrisma.periodTraderReport.findMany.mockResolvedValue([]);
      mockPrisma.periodTraderReport.upsert.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'DRAFT',
        ending_balance_usdt: '1325.4',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 3.1, TON: 1.4 },
        generated_by: 'admin-1',
        approved_by: null,
        approved_at: null,
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:05:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });

      const report = await service.upsertTraderReportDraft(
        'period-1',
        'trader-1',
        {
          ending_balance_usdt: 1325.4,
          trader_fee_percent: 40,
          network_fees_json: { TRON: 3.1, TON: 1.4 },
        },
        'admin-1',
      );

      expect(mockPrisma.periodTraderReport.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          investment_period_id_trader_id: {
            investment_period_id: 'period-1',
            trader_id: 'trader-1',
          },
        },
      }));
      expect(report.trader_report_id).toBe('report-1');
      expect(report.status).toBe('DRAFT');
      expect(report.ending_balance_usdt).toBe(1325.4);
    });

    it('rejects draft save for a trader with no deposits in the selected period', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.deposit.findMany.mockResolvedValue([]);
      mockPrisma.periodTraderReport.findMany.mockResolvedValue([]);

      await expect(service.upsertTraderReportDraft(
        'period-1',
        'trader-missing',
        {
          ending_balance_usdt: 1000,
          trader_fee_percent: 40,
          network_fees_json: {},
        },
        'admin-1',
      )).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitTraderReportForApproval', () => {
    it('moves a saved draft into pending approval', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'DRAFT',
        ending_balance_usdt: '1325.4',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 3.1 },
        generated_by: 'admin-1',
        approved_by: null,
        approved_at: null,
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:05:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.periodTraderReport.update.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'PENDING_APPROVAL',
        ending_balance_usdt: '1325.4',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 3.1 },
        generated_by: 'admin-1',
        approved_by: null,
        approved_at: null,
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:10:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });

      const report = await service.submitTraderReportForApproval('period-1', 'report-1');

      expect(report.status).toBe('PENDING_APPROVAL');
      expect(mockPrisma.periodTraderReport.update).toHaveBeenCalledWith({
        where: { trader_report_id: 'report-1' },
        data: { status: 'PENDING_APPROVAL' },
        include: expect.any(Object),
      });
    });
  });

  describe('approveTraderReport', () => {
    it('approves a pending trader report when approved by a different admin', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'PENDING_APPROVAL',
        ending_balance_usdt: '1325.4',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 3.1 },
        generated_by: 'admin-1',
        approved_by: null,
        approved_at: null,
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:05:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.periodTraderReport.update.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'APPROVED',
        ending_balance_usdt: '1325.4',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 3.1 },
        generated_by: 'admin-1',
        approved_by: 'admin-2',
        approved_at: new Date('2026-04-06T10:12:00.000Z'),
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:12:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });

      const report = await service.approveTraderReport('period-1', 'report-1', 'admin-2');

      expect(report.status).toBe('APPROVED');
      expect(report.approved_by).toBe('admin-2');
    });

    it('rejects self-approval for separation of duties', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'PENDING_APPROVAL',
        ending_balance_usdt: '1325.4',
        trader_fee_percent: '40',
        network_fees_json: {},
        generated_by: 'admin-1',
        approved_by: null,
        approved_at: null,
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:05:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });

      await expect(service.approveTraderReport('period-1', 'report-1', 'admin-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('publishTraderReport', () => {
    it('publishes an approved trader report and marks linked trader deposits as report ready', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'APPROVED',
        ending_balance_usdt: '1325.4',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 3.1 },
        generated_by: 'admin-1',
        approved_by: 'admin-2',
        approved_at: new Date('2026-04-06T10:12:00.000Z'),
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:12:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.periodTraderReport.update.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'PUBLISHED',
        ending_balance_usdt: '1325.4',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 3.1 },
        generated_by: 'admin-1',
        approved_by: 'admin-2',
        approved_at: new Date('2026-04-06T10:12:00.000Z'),
        published_at: new Date('2026-04-06T10:20:00.000Z'),
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:20:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.deposit.updateMany.mockResolvedValue({ count: 2 });

      const report = await service.publishTraderReport('period-1', 'report-1');

      expect(report.status).toBe('PUBLISHED');
      expect(mockPrisma.deposit.updateMany).toHaveBeenCalledWith({
        where: {
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          status: 'COMPLETED',
        },
        data: { status: 'REPORT_READY' },
      });
    });

    it('materializes deposit profit/loss reports from the published trader report allocation', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'APPROVED',
        ending_balance_usdt: '1200',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 10, TON: 5 },
        generated_by: 'admin-1',
        approved_by: 'admin-2',
        approved_at: new Date('2026-04-06T10:12:00.000Z'),
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:12:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.periodTraderReport.update.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'PUBLISHED',
        ending_balance_usdt: '1200',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 10, TON: 5 },
        generated_by: 'admin-1',
        approved_by: 'admin-2',
        approved_at: new Date('2026-04-06T10:12:00.000Z'),
        published_at: new Date('2026-04-06T10:20:00.000Z'),
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:20:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          deposit_id: 'dep-1',
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          network: 'TRON',
          asset_symbol: 'USDT',
          confirmed_amount: '600',
          requested_amount: null,
          source_address: 'source-1',
          return_address: null,
          created_at: new Date('2026-04-06T09:00:00.000Z'),
        },
        {
          deposit_id: 'dep-2',
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          network: 'TON',
          asset_symbol: 'USDT',
          confirmed_amount: '400',
          requested_amount: null,
          source_address: 'source-2',
          return_address: 'return-2',
          created_at: new Date('2026-04-06T09:05:00.000Z'),
        },
      ]);
      mockPrisma.profitLossReport.upsert.mockResolvedValue({
        report_id: 'plr-1',
      });
      mockPrisma.deposit.updateMany.mockResolvedValue({ count: 2 });

      await service.publishTraderReport('period-1', 'report-1');

      expect(mockPrisma.profitLossReport.upsert).toHaveBeenNthCalledWith(1, {
        where: { deposit_id: 'dep-1' },
        create: expect.objectContaining({
          deposit_id: 'dep-1',
          gross_result: '63',
          fee_amount: '10',
          net_result: '53',
          payout_amount: '653',
          calculation_method: 'TRADER_PERIOD_REPORT_ALLOCATION',
          report_reference: 'report-1',
          generated_by: 'admin-1',
          approved_by: 'admin-2',
          status: 'PUBLISHED',
        }),
        update: expect.objectContaining({
          gross_result: '63',
          fee_amount: '10',
          net_result: '53',
          payout_amount: '653',
          calculation_method: 'TRADER_PERIOD_REPORT_ALLOCATION',
          report_reference: 'report-1',
          approved_by: 'admin-2',
          status: 'PUBLISHED',
        }),
      });
      expect(mockPrisma.profitLossReport.upsert).toHaveBeenNthCalledWith(2, {
        where: { deposit_id: 'dep-2' },
        create: expect.objectContaining({
          deposit_id: 'dep-2',
          gross_result: '42',
          fee_amount: '5',
          net_result: '37',
          payout_amount: '437',
          calculation_method: 'TRADER_PERIOD_REPORT_ALLOCATION',
          report_reference: 'report-1',
          generated_by: 'admin-1',
          approved_by: 'admin-2',
          status: 'PUBLISHED',
        }),
        update: expect.objectContaining({
          gross_result: '42',
          fee_amount: '5',
          net_result: '37',
          payout_amount: '437',
          calculation_method: 'TRADER_PERIOD_REPORT_ALLOCATION',
          report_reference: 'report-1',
          approved_by: 'admin-2',
          status: 'PUBLISHED',
        }),
      });
    });
  });

  describe('previewTraderReport', () => {
    it('calculates trader-scoped totals and payout rows from selected period + trader inputs', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.deposit.findMany
        .mockResolvedValueOnce([
          {
            trader_id: 'trader-1',
            trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
          },
        ])
        .mockResolvedValueOnce([
          {
            deposit_id: 'dep-1',
            investment_period_id: 'period-1',
            trader_id: 'trader-1',
            network: 'TRON',
            asset_symbol: 'USDT',
            confirmed_amount: '600',
            requested_amount: null,
            source_address: 'source-1',
            return_address: null,
          },
          {
            deposit_id: 'dep-2',
            investment_period_id: 'period-1',
            trader_id: 'trader-1',
            network: 'TON',
            asset_symbol: 'USDT',
            confirmed_amount: '400',
            requested_amount: null,
            source_address: 'source-2',
            return_address: 'return-2',
          },
        ]);

      const preview = await service.previewTraderReport('period-1', 'trader-1', {
        ending_balance_usdt: 1200,
        trader_fee_percent: 40,
        network_fees_json: { TRON: 10, TON: 5 },
      });

      expect(preview.trader_nickname).toBe('alpha');
      expect(preview.total_deposits_usdt).toBe(1000);
      expect(preview.gross_pnl_usdt).toBe(200);
      expect(preview.trader_fee_usdt).toBe(80);
      expect(preview.total_network_fees_usdt).toBe(15);
      expect(preview.net_distributable_usdt).toBe(1105);
      expect(preview.rows).toHaveLength(2);
      expect(preview.rows[1].selected_payout_address).toBe('return-2');
      expect(preview.rows[1].address_source).toBe('RETURN_ADDRESS');
    });
  });

  describe('exportTraderReportCsv', () => {
    it('exports trader nickname and payout rows for one saved trader report', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'PENDING_APPROVAL',
        ending_balance_usdt: '1200',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 10, TON: 5 },
        generated_by: 'admin-1',
        approved_by: null,
        approved_at: null,
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:10:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          deposit_id: 'dep-1',
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          network: 'TRON',
          asset_symbol: 'USDT',
          confirmed_amount: '1000',
          requested_amount: null,
          source_address: 'source-1',
          return_address: null,
        },
      ]);

      const csv = await service.exportTraderReportCsv('period-1', 'report-1');

      expect(csv).toContain('trader_nickname,alpha');
      expect(csv).toContain('deposit_id,network,asset_symbol,deposit_amount_usdt');
      expect(csv).toContain('dep-1,TRON,USDT,1000');
    });
  });

  describe('generateTraderPayoutRegistry', () => {
    it('creates one immutable payout registry per approved trader report', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'APPROVED',
        ending_balance_usdt: '1200',
        trader_fee_percent: '40',
        network_fees_json: { TRON: 10, TON: 5 },
        generated_by: 'admin-1',
        approved_by: 'admin-2',
        approved_at: new Date('2026-04-06T10:12:00.000Z'),
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:10:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.payoutRegistry.findUnique.mockResolvedValue(null);
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          deposit_id: 'dep-1',
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          network: 'TRON',
          asset_symbol: 'USDT',
          confirmed_amount: '1000',
          requested_amount: null,
          source_address: 'source-1',
          return_address: null,
        },
      ]);
      mockPrisma.payoutRegistry.create.mockResolvedValue({
        payout_registry_id: 'registry-1',
        investment_period_id: 'period-1',
        trader_report_id: 'report-1',
        trader_id: 'trader-1',
        generated_by: 'admin-3',
        created_at: new Date('2026-04-06T10:20:00.000Z'),
        rows: [
          {
            payout_registry_row_id: 'row-1',
            payout_registry_id: 'registry-1',
            investment_period_id: 'period-1',
            trader_report_id: 'report-1',
            deposit_id: 'dep-1',
            trader_id: 'trader-1',
            trader_nickname: 'alpha',
            network: 'TRON',
            asset_symbol: 'USDT',
            deposit_amount_usdt: '1000',
            share_ratio: '1',
            payout_gross_usdt: '705',
            payout_fee_usdt: '10',
            payout_net_usdt: '695',
            default_payout_address: 'source-1',
            selected_payout_address: 'source-1',
            address_source: 'SOURCE_ADDRESS',
            status: 'PENDING',
            tx_hash: null,
            paid_at: null,
            failure_reason: null,
            notes: null,
            created_at: new Date('2026-04-06T10:20:00.000Z'),
            updated_at: new Date('2026-04-06T10:20:00.000Z'),
          },
        ],
      });

      const registry = await service.generateTraderPayoutRegistry('period-1', 'report-1', 'admin-3');

      expect(registry.payout_registry_id).toBe('registry-1');
      expect(registry.rows).toHaveLength(1);
      expect(registry.rows[0].status).toBe('PENDING');
      expect(mockPrisma.payoutRegistry.create).toHaveBeenCalled();
    });
  });

  describe('getPeriodCompletionReadiness', () => {
    it('blocks completion when a required trader registry still has pending rows', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          trader_id: 'trader-1',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);
      mockPrisma.periodTraderReport.findMany.mockResolvedValue([
        {
          trader_report_id: 'report-1',
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          status: 'PUBLISHED',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);
      mockPrisma.payoutRegistry.findMany.mockResolvedValue([
        {
          payout_registry_id: 'registry-1',
          investment_period_id: 'period-1',
          trader_report_id: 'report-1',
          trader_id: 'trader-1',
          rows: [
            { status: 'PENDING' },
            { status: 'PAID_BATCH' },
          ],
        },
      ]);

      const readiness = await service.getPeriodCompletionReadiness('period-1');

      expect(readiness.ready).toBe(false);
      expect(readiness.blockers).toContain('registry_rows_not_terminal');
    });
  });

  describe('updateStatus', () => {
    it('moves active period deposits into COMPLETED when period is locked', async () => {
      mockPrisma.investmentPeriod.update.mockResolvedValue({
        investment_period_id: 'period-1',
        title: 'Sprint 1',
        period_type: 'sprint',
        start_date: new Date('2026-04-01T00:00:00.000Z'),
        end_date: new Date('2026-04-08T00:00:00.000Z'),
        lock_date: new Date('2026-04-08T00:00:00.000Z'),
        status: 'LOCKED',
        accepted_networks: ['TON', 'TRON', 'BSC'],
        accepted_assets: ['USDT'],
        minimum_amount_rules: null,
        maximum_amount_rules: null,
        created_by: null,
        created_at: new Date('2026-04-01T00:00:00.000Z'),
        updated_at: new Date('2026-04-08T00:00:00.000Z'),
      });
      mockPrisma.deposit.updateMany.mockResolvedValue({ count: 3 });

      await service.updateStatus('period-1', 'LOCKED');

      expect(mockPrisma.deposit.updateMany).toHaveBeenCalledWith({
        where: {
          investment_period_id: 'period-1',
          status: 'ACTIVE',
        },
        data: {
          status: 'COMPLETED',
          completed_at: expect.any(Date),
        },
      });
    });

    it('cancels expired awaiting transfers and flags detected transfers for manual review in closed periods', async () => {
      mockPrisma.investmentPeriod.update.mockResolvedValue({
        investment_period_id: 'period-1',
        title: 'Sprint 1',
        period_type: 'sprint',
        start_date: new Date('2026-04-01T00:00:00.000Z'),
        end_date: new Date('2026-04-08T00:00:00.000Z'),
        lock_date: new Date('2026-04-08T00:00:00.000Z'),
        status: 'ARCHIVED',
        accepted_networks: ['TON', 'TRON', 'BSC'],
        accepted_assets: ['USDT'],
        minimum_amount_rules: null,
        maximum_amount_rules: null,
        created_by: null,
        created_at: new Date('2026-04-01T00:00:00.000Z'),
        updated_at: new Date('2026-04-08T00:00:00.000Z'),
      });
      mockPrisma.deposit.updateMany.mockResolvedValue({ count: 0 });

      await service.updateStatus('period-1', 'ARCHIVED');

      expect(mockPrisma.deposit.updateMany).toHaveBeenNthCalledWith(
        2,
        {
          where: {
            investment_period_id: 'period-1',
            status: 'AWAITING_TRANSFER',
            tx_hash: null,
          },
          data: {
            status: 'CANCELLED',
            cancelled_at: expect.any(Date),
            status_reason: 'Period closed before transfer was detected',
          },
        },
      );

      expect(mockPrisma.deposit.updateMany).toHaveBeenNthCalledWith(
        3,
        {
          where: {
            investment_period_id: 'period-1',
            status: {
              in: ['DETECTED', 'CONFIRMING'],
            },
            OR: [
              { tx_hash: { not: null } },
              { confirmed_amount: { not: null } },
            ],
          },
          data: {
            status: 'MANUAL_REVIEW',
            status_reason: 'Period closed before blockchain confirmation flow completed',
          },
        },
      );
    });

    it('blocks period completion when trader payout registries are not terminal', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          trader_id: 'trader-1',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);
      mockPrisma.periodTraderReport.findMany.mockResolvedValue([
        {
          trader_report_id: 'report-1',
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          status: 'PUBLISHED',
          trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
        },
      ]);
      mockPrisma.payoutRegistry.findMany.mockResolvedValue([
        {
          payout_registry_id: 'registry-1',
          investment_period_id: 'period-1',
          trader_report_id: 'report-1',
          trader_id: 'trader-1',
          rows: [{ status: 'PENDING' }],
        },
      ]);

      await expect(service.updateStatus('period-1', 'COMPLETED')).rejects.toThrow(BadRequestException);
    });
  });

  describe('publishTraderReport', () => {
    it('moves only completed deposits into REPORT_READY', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
      });
      mockPrisma.periodTraderReport.findUnique.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'APPROVED',
        ending_balance_usdt: '1200',
        trader_fee_percent: '40',
        network_fees_json: {},
        generated_by: 'admin-1',
        approved_by: 'admin-2',
        approved_at: new Date('2026-04-06T10:12:00.000Z'),
        published_at: null,
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:10:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.periodTraderReport.update.mockResolvedValue({
        trader_report_id: 'report-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        status: 'PUBLISHED',
        ending_balance_usdt: '1200',
        trader_fee_percent: '40',
        network_fees_json: {},
        generated_by: 'admin-1',
        approved_by: 'admin-2',
        approved_at: new Date('2026-04-06T10:12:00.000Z'),
        published_at: new Date('2026-04-06T10:13:00.000Z'),
        created_at: new Date('2026-04-06T10:00:00.000Z'),
        updated_at: new Date('2026-04-06T10:13:00.000Z'),
        trader: { trader_id: 'trader-1', nickname: 'alpha', slug: 'alpha', display_name: 'Alpha' },
      });
      mockPrisma.deposit.updateMany.mockResolvedValue({ count: 1 });

      await service.publishTraderReport('period-1', 'report-1');

      expect(mockPrisma.deposit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            investment_period_id: 'period-1',
            trader_id: 'trader-1',
            status: 'COMPLETED',
          }),
          data: { status: 'REPORT_READY' },
        }),
      );
    });
  });

  describe('updatePayoutRegistryRow', () => {
    it('marks one payout registry row as paid manually with optional tx hash and note', async () => {
      mockPrisma.payoutRegistryRow.findUnique.mockResolvedValue({
        payout_registry_row_id: 'row-1',
        payout_registry_id: 'registry-1',
        investment_period_id: 'period-1',
        trader_report_id: 'report-1',
        deposit_id: 'dep-1',
        trader_id: 'trader-1',
        trader_nickname: 'alpha',
        network: 'TRON',
        asset_symbol: 'USDT',
        deposit_amount_usdt: '1000',
        share_ratio: '1',
        payout_gross_usdt: '705',
        payout_fee_usdt: '10',
        payout_net_usdt: '695',
        default_payout_address: 'source-1',
        selected_payout_address: 'source-1',
        address_source: 'SOURCE_ADDRESS',
        status: 'PENDING',
        tx_hash: null,
        paid_at: null,
        failure_reason: null,
        notes: null,
        created_at: new Date('2026-04-06T10:20:00.000Z'),
        updated_at: new Date('2026-04-06T10:20:00.000Z'),
      });
      mockPrisma.payoutRegistryRow.update.mockResolvedValue({
        payout_registry_row_id: 'row-1',
        payout_registry_id: 'registry-1',
        investment_period_id: 'period-1',
        trader_report_id: 'report-1',
        deposit_id: 'dep-1',
        trader_id: 'trader-1',
        trader_nickname: 'alpha',
        network: 'TRON',
        asset_symbol: 'USDT',
        deposit_amount_usdt: '1000',
        share_ratio: '1',
        payout_gross_usdt: '705',
        payout_fee_usdt: '10',
        payout_net_usdt: '695',
        default_payout_address: 'source-1',
        selected_payout_address: 'source-1',
        address_source: 'SOURCE_ADDRESS',
        status: 'PAID_MANUAL',
        tx_hash: 'tx-1',
        paid_at: new Date('2026-04-06T11:00:00.000Z'),
        failure_reason: null,
        notes: 'paid on chain',
        created_at: new Date('2026-04-06T10:20:00.000Z'),
        updated_at: new Date('2026-04-06T11:00:00.000Z'),
      });

      const row = await service.updatePayoutRegistryRow('row-1', {
        status: 'PAID_MANUAL',
        tx_hash: 'tx-1',
        notes: 'paid on chain',
      });

      expect(row.status).toBe('PAID_MANUAL');
      expect(row.tx_hash).toBe('tx-1');
      expect(row.notes).toBe('paid on chain');
    });

    it('allows payout address override without changing frozen financial amounts', async () => {
      mockPrisma.payoutRegistryRow.findUnique.mockResolvedValue({
        payout_registry_row_id: 'row-1',
        payout_registry_id: 'registry-1',
        investment_period_id: 'period-1',
        trader_report_id: 'report-1',
        deposit_id: 'dep-1',
        trader_id: 'trader-1',
        trader_nickname: 'alpha',
        network: 'TRON',
        asset_symbol: 'USDT',
        deposit_amount_usdt: '1000',
        share_ratio: '1',
        payout_gross_usdt: '705',
        payout_fee_usdt: '10',
        payout_net_usdt: '695',
        default_payout_address: 'source-1',
        selected_payout_address: 'source-1',
        address_source: 'SOURCE_ADDRESS',
        status: 'PENDING',
        tx_hash: null,
        paid_at: null,
        failure_reason: null,
        notes: null,
        created_at: new Date('2026-04-06T10:20:00.000Z'),
        updated_at: new Date('2026-04-06T10:20:00.000Z'),
      });
      mockPrisma.payoutRegistryRow.update.mockResolvedValue({
        payout_registry_row_id: 'row-1',
        payout_registry_id: 'registry-1',
        investment_period_id: 'period-1',
        trader_report_id: 'report-1',
        deposit_id: 'dep-1',
        trader_id: 'trader-1',
        trader_nickname: 'alpha',
        network: 'TRON',
        asset_symbol: 'USDT',
        deposit_amount_usdt: '1000',
        share_ratio: '1',
        payout_gross_usdt: '705',
        payout_fee_usdt: '10',
        payout_net_usdt: '695',
        default_payout_address: 'source-1',
        selected_payout_address: 'override-1',
        address_source: 'MANUAL_OVERRIDE',
        status: 'PENDING',
        tx_hash: null,
        paid_at: null,
        failure_reason: null,
        notes: null,
        created_at: new Date('2026-04-06T10:20:00.000Z'),
        updated_at: new Date('2026-04-06T10:30:00.000Z'),
      });

      const row = await service.updatePayoutRegistryRow('row-1', {
        selected_payout_address: 'override-1',
      });

      expect(row.selected_payout_address).toBe('override-1');
      expect(row.address_source).toBe('MANUAL_OVERRIDE');
      expect(row.payout_net_usdt).toBe(695);
    });
  });

  describe('markRemainingPayoutRegistryRowsAsPaid', () => {
    it('marks only remaining pending rows as paid batch and keeps already completed rows untouched', async () => {
      mockPrisma.payoutRegistry.findUnique.mockResolvedValue({
        payout_registry_id: 'registry-1',
        investment_period_id: 'period-1',
        trader_report_id: 'report-1',
        trader_id: 'trader-1',
        rows: [
          { status: 'PENDING' },
          { status: 'PAID_MANUAL' },
          { status: 'SKIPPED' },
        ],
      });
      mockPrisma.payoutRegistryRow.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.markRemainingPayoutRegistryRowsAsPaid('registry-1', 'batch settled');

      expect(result.updated_count).toBe(1);
      expect(mockPrisma.payoutRegistryRow.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          payout_registry_id: 'registry-1',
          status: 'PENDING',
        }),
      }));
    });
  });
});
