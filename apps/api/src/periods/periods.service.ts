import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BulkPayoutRegistryUpdateDto,
  CreatePeriodDto,
  PayoutRegistryDto,
  PeriodTraderReportDto,
  PeriodCompletionReadinessDto,
  PeriodTraderReportPreviewDto,
  PeriodTraderReportSummaryDto,
  UpdatePeriodDto,
  UpdatePayoutRegistryRowDto,
  UpsertPeriodTraderReportDto,
} from './dto/period.dto';
import { InvestmentPeriodStatus, ReportStatus } from '@prisma/client';
import { ReferralRewardsService } from '../referrals/referral-rewards.service';
import { randomUUID } from 'crypto';

@Injectable()
export class PeriodsService {
  constructor(
    private prisma: PrismaService,
    private referralRewardsService: ReferralRewardsService,
  ) {}

  private readonly depositClosingPeriodStatuses = new Set<InvestmentPeriodStatus>([
    InvestmentPeriodStatus.LOCKED,
    InvestmentPeriodStatus.COMPLETED,
    InvestmentPeriodStatus.ARCHIVED,
  ]);

  private readonly settlementEligibleDepositStatuses = [
    'COMPLETED',
    'REPORT_READY',
    'PAYOUT_PENDING',
    'PAYOUT_APPROVED',
    'PAYOUT_SENT',
    'PAYOUT_CONFIRMED',
  ];

  private readonly traderReportInclude = {
    trader: {
      select: {
        trader_id: true,
        nickname: true,
        slug: true,
        display_name: true,
      },
    },
  };

  private readonly payoutRegistryInclude = {
    rows: {
      include: {
        deposit: {
          select: {
            user_id: true,
            source_address: true,
            source_address_display: true,
            return_address: true,
            return_address_display: true,
            user: {
              select: {
                user_id: true,
                username: true,
                display_name: true,
              },
            },
          },
        },
      },
    },
  };

  async findAll(status?: string) {
    const where = status ? { status: status as InvestmentPeriodStatus } : { status: InvestmentPeriodStatus.ACTIVE };

    const periods = await this.prisma.investmentPeriod.findMany({
      where,
      orderBy: { start_date: 'asc' },
    });

    return periods.map(this.serialize);
  }

  async findOne(id: string) {
    const period = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
    });

    if (!period) {
      throw new NotFoundException('Investment period not found');
    }

    return this.serialize(period);
  }

  async create(dto: CreatePeriodDto, createdBy?: string) {
    const period = await this.prisma.investmentPeriod.create({
      data: {
        title: dto.title,
        period_type: dto.period_type,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        lock_date: dto.lock_date ? new Date(dto.lock_date) : null,
        accepted_networks: dto.accepted_networks,
        accepted_assets: dto.accepted_assets,
        status: (dto.status as InvestmentPeriodStatus) || InvestmentPeriodStatus.DRAFT,
        minimum_amount_rules: dto.minimum_amount_rules
          ? JSON.parse(JSON.stringify(dto.minimum_amount_rules))
          : null,
        maximum_amount_rules: dto.maximum_amount_rules
          ? JSON.parse(JSON.stringify(dto.maximum_amount_rules))
          : null,
        created_by: createdBy,
      },
    });

    return this.serialize(period);
  }

  async update(id: string, dto: UpdatePeriodDto) {
    const existing = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
    });

    if (!existing) {
      throw new NotFoundException('Investment period not found');
    }

    const updateData: any = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.start_date) updateData.start_date = new Date(dto.start_date);
    if (dto.end_date) updateData.end_date = new Date(dto.end_date);
    if (dto.lock_date) updateData.lock_date = new Date(dto.lock_date);
    if (dto.status) updateData.status = dto.status as InvestmentPeriodStatus;
    if (dto.accepted_networks) updateData.accepted_networks = dto.accepted_networks;
    if (dto.accepted_assets) updateData.accepted_assets = dto.accepted_assets;

    const period = await this.prisma.investmentPeriod.update({
      where: { investment_period_id: id },
      data: updateData,
    });

    return this.serialize(period);
  }

  async updateStatus(id: string, status: string) {
    if (status === InvestmentPeriodStatus.COMPLETED) {
      const readiness = await this.getPeriodCompletionReadiness(id);
      if (!readiness.ready) {
        throw new BadRequestException(`Period cannot be completed: ${readiness.blockers.join(', ')}`);
      }
    }

    if (this.depositClosingPeriodStatuses.has(status as InvestmentPeriodStatus)) {
      const now = new Date();

      await this.prisma.deposit.updateMany({
        where: {
          investment_period_id: id,
          status: 'ACTIVE',
        },
        data: {
          status: 'COMPLETED',
          completed_at: now,
        },
      });

      await this.prisma.deposit.updateMany({
        where: {
          investment_period_id: id,
          status: 'AWAITING_TRANSFER',
          tx_hash: null,
        },
        data: {
          status: 'CANCELLED',
          cancelled_at: now,
          status_reason: 'Period closed before transfer was detected',
        },
      });

      await this.prisma.deposit.updateMany({
        where: {
          investment_period_id: id,
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
      });
    }

    const period = await this.prisma.investmentPeriod.update({
      where: { investment_period_id: id },
      data: { status: status as InvestmentPeriodStatus },
    });

    return this.serialize(period);
  }

  async listTraderReports(periodId: string): Promise<PeriodTraderReportSummaryDto[]> {
    await this.ensurePeriodExists(periodId);

    const requiredByTraderId = await this.getRequiredTraderMap(periodId);

    const existingReports = await (this.prisma as any).periodTraderReport.findMany({
      where: { investment_period_id: periodId },
      include: this.traderReportInclude,
      orderBy: { created_at: 'asc' },
    });

    const existingByTraderId = new Map<string, any>();
    for (const report of existingReports) {
      existingByTraderId.set(report.trader_id, report);
    }

    return [...requiredByTraderId.entries()].map(([traderId, trader]) => {
      const existingReport = existingByTraderId.get(traderId);

      return {
        trader_report_id: existingReport?.trader_report_id ?? null,
        investment_period_id: periodId,
        trader_id: trader.trader_id,
        trader_nickname: trader.nickname,
        trader_slug: trader.slug,
        trader_display_name: trader.display_name,
        status: existingReport?.status ?? 'MISSING',
        required: true,
        ending_balance_usdt: this.parseOptionalDecimal(existingReport?.ending_balance_usdt),
        trader_fee_percent: this.parseOptionalDecimal(existingReport?.trader_fee_percent),
        network_fees_json: existingReport ? ((existingReport.network_fees_json as Record<string, number>) ?? {}) : null,
        generated_by: existingReport?.generated_by ?? null,
        approved_by: existingReport?.approved_by ?? null,
        approved_at: existingReport?.approved_at?.toISOString() ?? null,
        published_at: existingReport?.published_at?.toISOString() ?? null,
        created_at: existingReport?.created_at?.toISOString() ?? null,
        updated_at: existingReport?.updated_at?.toISOString() ?? null,
      };
    });
  }

  async upsertTraderReportDraft(
    periodId: string,
    traderId: string,
    dto: UpsertPeriodTraderReportDto,
    generatedBy: string,
  ): Promise<PeriodTraderReportDto> {
    await this.ensurePeriodExists(periodId);

    const requiredTrader = await this.getRequiredTrader(periodId, traderId);
    if (!requiredTrader) {
      throw new BadRequestException('Trader report can only be created for a trader with deposits in the selected period');
    }

    const existingReport = await (this.prisma as any).periodTraderReport.findUnique({
      where: {
        investment_period_id_trader_id: {
          investment_period_id: periodId,
          trader_id: traderId,
        },
      },
      include: this.traderReportInclude,
    });

    if (existingReport?.status === ReportStatus.PUBLISHED) {
      throw new BadRequestException('Cannot revise a published trader report');
    }

    const report = await (this.prisma as any).periodTraderReport.upsert({
      where: {
        investment_period_id_trader_id: {
          investment_period_id: periodId,
          trader_id: traderId,
        },
      },
      create: {
        investment_period_id: periodId,
        trader_id: traderId,
        status: ReportStatus.DRAFT,
        ending_balance_usdt: dto.ending_balance_usdt.toString(),
        trader_fee_percent: (dto.trader_fee_percent ?? 40).toString(),
        network_fees_json: dto.network_fees_json ?? {},
        generated_by: generatedBy,
      },
      update: {
        ending_balance_usdt: dto.ending_balance_usdt.toString(),
        trader_fee_percent: (dto.trader_fee_percent ?? 40).toString(),
        network_fees_json: dto.network_fees_json ?? {},
        status: existingReport ? ReportStatus.REVISED : ReportStatus.DRAFT,
      },
      include: this.traderReportInclude,
    });

    return this.serializeTraderReport(report, true);
  }

  async getTraderReportBuilder(
    periodId: string,
    traderId: string,
  ): Promise<PeriodTraderReportPreviewDto> {
    await this.ensurePeriodExists(periodId);

    const requiredTrader = await this.getRequiredTrader(periodId, traderId);
    if (!requiredTrader) {
      throw new BadRequestException('Trader report builder requires a trader with deposits in the selected period');
    }

    const existingReport = await (this.prisma as any).periodTraderReport.findUnique({
      where: {
        investment_period_id_trader_id: {
          investment_period_id: periodId,
          trader_id: traderId,
        },
      },
      include: this.traderReportInclude,
    });

    const deposits = await this.getTraderDeposits(periodId, traderId);
    const depositIds = deposits.map((deposit) => deposit.deposit_id);
    const referralMode = existingReport?.status === ReportStatus.PUBLISHED
      ? 'MATERIALIZED'
      : 'PROJECTED';
    const referralTotals = referralMode === 'MATERIALIZED'
      ? await this.getReferralRewardTotals(periodId, depositIds)
      : this.aggregateReferralPreviewTotals(
        existingReport?.trader_report_id
          ? await this.referralRewardsService.previewRewardsForPublishedTraderReport(
            existingReport.trader_report_id,
            periodId,
          )
          : [],
        depositIds,
      );
    const metricsSummary = await this.getTraderMetricsSummary(periodId, traderId);
    const registrySummary = await this.getTraderRegistrySummary(existingReport?.trader_report_id ?? null);

    const previewInput = existingReport
      ? {
        ending_balance_usdt: this.parseOptionalDecimal(existingReport.ending_balance_usdt) ?? 0,
        trader_fee_percent: this.parseOptionalDecimal(existingReport.trader_fee_percent) ?? 40,
        network_fees_json: (existingReport.network_fees_json as Record<string, number>) ?? {},
      }
      : this.getDefaultTraderReportInput(deposits);

    return this.buildTraderReportPreview(
      periodId,
      requiredTrader,
      deposits,
      previewInput,
      {
        report: existingReport ? this.serializeTraderReport(existingReport, true) : null,
        referralMode,
        referralTotals,
        metricsSummary,
        registrySummary,
      },
    );
  }

  async submitTraderReportForApproval(periodId: string, reportId: string): Promise<PeriodTraderReportDto> {
    await this.ensurePeriodExists(periodId);

    const report = await (this.prisma as any).periodTraderReport.findUnique({
      where: { trader_report_id: reportId },
      include: this.traderReportInclude,
    });

    if (!report || report.investment_period_id !== periodId) {
      throw new NotFoundException('Trader report not found');
    }

    if (report.status !== ReportStatus.DRAFT && report.status !== ReportStatus.REVISED) {
      throw new BadRequestException('Trader report must be in DRAFT or REVISED status before review');
    }

    const updated = await (this.prisma as any).periodTraderReport.update({
      where: { trader_report_id: reportId },
      data: { status: ReportStatus.PENDING_APPROVAL },
      include: this.traderReportInclude,
    });

    return this.serializeTraderReport(updated, true);
  }

  async approveTraderReport(
    periodId: string,
    reportId: string,
    approvedBy: string,
  ): Promise<PeriodTraderReportDto> {
    await this.ensurePeriodExists(periodId);

    const report = await (this.prisma as any).periodTraderReport.findUnique({
      where: { trader_report_id: reportId },
      include: this.traderReportInclude,
    });

    if (!report || report.investment_period_id !== periodId) {
      throw new NotFoundException('Trader report not found');
    }

    if (report.status !== ReportStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Trader report must be pending approval');
    }

    if (report.generated_by === approvedBy) {
      throw new BadRequestException('Cannot approve your own trader report (separation of duties)');
    }

    const updated = await (this.prisma as any).periodTraderReport.update({
      where: { trader_report_id: reportId },
      data: {
        status: ReportStatus.APPROVED,
        approved_by: approvedBy,
        approved_at: new Date(),
      },
      include: this.traderReportInclude,
    });

    return this.serializeTraderReport(updated, true);
  }

  async publishTraderReport(periodId: string, reportId: string): Promise<PeriodTraderReportDto> {
    await this.ensurePeriodExists(periodId);

    const report = await (this.prisma as any).periodTraderReport.findUnique({
      where: { trader_report_id: reportId },
      include: this.traderReportInclude,
    });

    if (!report || report.investment_period_id !== periodId) {
      throw new NotFoundException('Trader report not found');
    }

    if (report.status !== ReportStatus.APPROVED && report.status !== ReportStatus.PUBLISHED) {
      throw new BadRequestException('Trader report must be approved before publishing');
    }

    const updated = report.status === ReportStatus.PUBLISHED
      ? report
      : await (this.prisma as any).periodTraderReport.update({
        where: { trader_report_id: reportId },
        data: {
          status: ReportStatus.PUBLISHED,
          published_at: new Date(),
        },
        include: this.traderReportInclude,
      });

    await this.materializeDepositReportsFromTraderReport(updated);

    await this.prisma.deposit.updateMany({
      where: {
        investment_period_id: periodId,
        trader_id: report.trader_id,
        status: 'COMPLETED',
      },
      data: { status: 'REPORT_READY' },
    });

    await this.materializeSettlementOutcomesForPublishedTraderReport(updated);

    await this.referralRewardsService.materializeRewardsForPublishedTraderReport(
      updated.trader_report_id,
      periodId,
    );

    return this.serializeTraderReport(updated, true);
  }

  async previewTraderReport(
    periodId: string,
    traderId: string,
    dto: UpsertPeriodTraderReportDto,
  ): Promise<PeriodTraderReportPreviewDto> {
    await this.ensurePeriodExists(periodId);

    const requiredTrader = await this.getRequiredTrader(periodId, traderId);
    if (!requiredTrader) {
      throw new BadRequestException('Trader report preview requires a trader with deposits in the selected period');
    }

    const deposits = await this.getTraderDeposits(periodId, traderId);
    const existingReport = await (this.prisma as any).periodTraderReport.findUnique({
      where: {
        investment_period_id_trader_id: {
          investment_period_id: periodId,
          trader_id: traderId,
        },
      },
      include: this.traderReportInclude,
    });
    const referralTotals = await this.getReferralRewardTotals(periodId, deposits.map((deposit) => deposit.deposit_id));
    const metricsSummary = await this.getTraderMetricsSummary(periodId, traderId);
    const registrySummary = await this.getTraderRegistrySummary(existingReport?.trader_report_id ?? null);

    return this.buildTraderReportPreview(periodId, requiredTrader, deposits, dto, {
      report: existingReport ? this.serializeTraderReport(existingReport, true) : null,
      referralTotals,
      metricsSummary,
      registrySummary,
    });
  }

  async exportTraderReportCsv(periodId: string, reportId: string): Promise<string> {
    await this.ensurePeriodExists(periodId);

    const report = await (this.prisma as any).periodTraderReport.findUnique({
      where: { trader_report_id: reportId },
      include: this.traderReportInclude,
    });

    if (!report || report.investment_period_id !== periodId) {
      throw new NotFoundException('Trader report not found');
    }

    const deposits = await this.getTraderDeposits(periodId, report.trader_id);
    const preview = this.buildTraderReportPreview(periodId, report.trader, deposits, {
      ending_balance_usdt: parseFloat(report.ending_balance_usdt.toString()),
      trader_fee_percent: parseFloat(report.trader_fee_percent.toString()),
      network_fees_json: (report.network_fees_json as Record<string, number>) ?? {},
    });

    const lines = [
      `investment_period_id,${preview.investment_period_id}`,
      `trader_id,${preview.trader_id}`,
      `trader_nickname,${preview.trader_nickname}`,
      `trader_slug,${preview.trader_slug}`,
      `total_deposits_usdt,${preview.total_deposits_usdt}`,
      `gross_pnl_usdt,${preview.gross_pnl_usdt}`,
      `trader_fee_usdt,${preview.trader_fee_usdt}`,
      `total_network_fees_usdt,${preview.total_network_fees_usdt}`,
      `net_distributable_usdt,${preview.net_distributable_usdt}`,
      '',
      'deposit_id,network,asset_symbol,deposit_amount_usdt,share_ratio,payout_gross_usdt,payout_fee_usdt,payout_net_usdt,selected_payout_address,address_source',
      ...preview.rows.map((row) => [
        row.deposit_id,
        row.network,
        row.asset_symbol,
        row.deposit_amount_usdt,
        row.share_ratio,
        row.payout_gross_usdt,
        row.payout_fee_usdt,
        row.payout_net_usdt,
        row.selected_payout_address ?? '',
        row.address_source,
      ].join(',')),
    ];

    return lines.join('\n');
  }

  async generateTraderPayoutRegistry(
    periodId: string,
    reportId: string,
    generatedBy: string,
  ): Promise<PayoutRegistryDto> {
    await this.ensurePeriodExists(periodId);

    const report = await (this.prisma as any).periodTraderReport.findUnique({
      where: { trader_report_id: reportId },
      include: this.traderReportInclude,
    });

    if (!report || report.investment_period_id !== periodId) {
      throw new NotFoundException('Trader report not found');
    }

    if (report.status !== ReportStatus.APPROVED && report.status !== ReportStatus.PUBLISHED) {
      throw new BadRequestException('Trader report must be approved before payout registry generation');
    }

    const existingRegistry = await (this.prisma as any).payoutRegistry.findUnique({
      where: { trader_report_id: reportId },
      include: this.payoutRegistryInclude,
    });

    if (existingRegistry) {
      throw new BadRequestException('Payout registry already exists for this trader report');
    }

    const deposits = await this.getTraderDeposits(periodId, report.trader_id);
    const preview = this.buildTraderReportPreview(periodId, report.trader, deposits, {
      ending_balance_usdt: parseFloat(report.ending_balance_usdt?.toString() ?? '0'),
      trader_fee_percent: parseFloat(report.trader_fee_percent?.toString() ?? '40'),
      network_fees_json: (report.network_fees_json as Record<string, number>) ?? {},
    });

      const registry = await (this.prisma as any).payoutRegistry.create({
        data: {
        investment_period_id: periodId,
        trader_report_id: reportId,
        trader_id: report.trader_id,
        generated_by: generatedBy,
        rows: {
          create: preview.rows.map((row) => ({
            investment_period_id: periodId,
            trader_report_id: reportId,
            deposit_id: row.deposit_id,
            trader_id: report.trader_id,
            trader_nickname: report.trader.nickname,
            network: row.network,
            asset_symbol: row.asset_symbol,
            deposit_amount_usdt: row.deposit_amount_usdt.toString(),
            share_ratio: row.share_ratio.toString(),
            payout_gross_usdt: row.payout_gross_usdt.toString(),
            payout_fee_usdt: row.payout_fee_usdt.toString(),
            payout_net_usdt: row.payout_net_usdt.toString(),
            default_payout_address: row.default_payout_address,
            selected_payout_address: row.selected_payout_address,
            address_source: row.address_source,
            status: 'PENDING',
          })),
        },
        },
      include: this.payoutRegistryInclude,
      });

    return this.serializePayoutRegistry(registry);
  }

  async getTraderPayoutRegistry(periodId: string, reportId: string): Promise<PayoutRegistryDto | null> {
    await this.ensurePeriodExists(periodId);

    const registry = await (this.prisma as any).payoutRegistry.findUnique({
      where: { trader_report_id: reportId },
      include: this.payoutRegistryInclude,
    });

    if (!registry) {
      return null;
    }

    if (registry.investment_period_id !== periodId) {
      throw new NotFoundException('Payout registry not found');
    }

    return this.serializePayoutRegistry(registry);
  }

  async getPeriodCompletionReadiness(periodId: string): Promise<PeriodCompletionReadinessDto> {
    await this.ensurePeriodExists(periodId);

    const requiredReports = await this.listTraderReports(periodId);
    const blockers = new Set<string>();

    if (requiredReports.some((report) => !report.trader_report_id || report.status !== ReportStatus.PUBLISHED)) {
      blockers.add('required_reports_not_published');
    }

    const registries = await (this.prisma as any).payoutRegistry.findMany({
      where: { investment_period_id: periodId },
      include: { rows: true },
    });

    const registryByReportId = new Map<string, any>();
    for (const registry of registries) {
      registryByReportId.set(registry.trader_report_id, registry);
    }

    if (requiredReports.some((report) => report.trader_report_id && !registryByReportId.has(report.trader_report_id))) {
      blockers.add('required_registries_missing');
    }

    const terminalStatuses = new Set(['PAID_MANUAL', 'PAID_BATCH', 'SKIPPED']);
    for (const registry of registries) {
      if (registry.rows.some((row: any) => !terminalStatuses.has(row.status))) {
        blockers.add('registry_rows_not_terminal');
        break;
      }
    }

    return {
      ready: blockers.size === 0,
      blockers: [...blockers],
    };
  }

  async updatePayoutRegistryRow(
    rowId: string,
    dto: UpdatePayoutRegistryRowDto,
  ) {
    const row = await (this.prisma as any).payoutRegistryRow.findUnique({
      where: { payout_registry_row_id: rowId },
    });

    if (!row) {
      throw new NotFoundException('Payout registry row not found');
    }

    const data: Record<string, any> = {};

    if (dto.selected_payout_address !== undefined) {
      data.selected_payout_address = dto.selected_payout_address;
      data.address_source = 'MANUAL_OVERRIDE';
    }

    if (dto.tx_hash !== undefined) {
      data.tx_hash = dto.tx_hash;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes;
    }

    if (dto.failure_reason !== undefined) {
      data.failure_reason = dto.failure_reason;
    }

    if (dto.status !== undefined) {
      data.status = dto.status;

      if (dto.status === 'PAID_MANUAL' || dto.status === 'PAID_BATCH') {
        data.paid_at = new Date();
      }

      if (dto.status !== 'FAILED' && dto.failure_reason === undefined) {
        data.failure_reason = null;
      }
    }

    await (this.prisma as any).payoutRegistryRow.update({
      where: { payout_registry_row_id: rowId },
      data,
    });

    const enrichedRow = await (this.prisma as any).payoutRegistryRow.findUnique({
      where: { payout_registry_row_id: rowId },
      include: {
        deposit: {
          select: {
            user_id: true,
            source_address: true,
            source_address_display: true,
            return_address: true,
            return_address_display: true,
            user: {
              select: {
                user_id: true,
                username: true,
                display_name: true,
              },
            },
          },
        },
      },
    });

    return this.serializePayoutRegistryRow(enrichedRow);
  }

  async markRemainingPayoutRegistryRowsAsPaid(
    registryId: string,
    note?: string,
  ): Promise<BulkPayoutRegistryUpdateDto> {
    const registry = await (this.prisma as any).payoutRegistry.findUnique({
      where: { payout_registry_id: registryId },
      include: { rows: true },
    });

    if (!registry) {
      throw new NotFoundException('Payout registry not found');
    }

    const result = await (this.prisma as any).payoutRegistryRow.updateMany({
      where: {
        payout_registry_id: registryId,
        status: 'PENDING',
      },
      data: {
        status: 'PAID_BATCH',
        paid_at: new Date(),
        notes: note ?? null,
      },
    });

    return {
      updated_count: result.count,
    };
  }

  private async getRequiredTraderMap(periodId: string): Promise<Map<string, any>> {
    const deposits = await this.prisma.deposit.findMany({
      where: {
        investment_period_id: periodId,
        trader_id: { not: null },
        status: { in: this.settlementEligibleDepositStatuses as any },
      },
      select: {
        trader_id: true,
        trader: {
          select: {
            trader_id: true,
            nickname: true,
            slug: true,
            display_name: true,
          },
        },
      },
    });

    const requiredByTraderId = new Map<string, any>();
    for (const deposit of deposits) {
      if (!deposit.trader_id || !deposit.trader) {
        continue;
      }

      if (!requiredByTraderId.has(deposit.trader_id)) {
        requiredByTraderId.set(deposit.trader_id, deposit.trader);
      }
    }

    return requiredByTraderId;
  }

  private async getRequiredTrader(periodId: string, traderId: string): Promise<any | null> {
    const requiredByTraderId = await this.getRequiredTraderMap(periodId);
    return requiredByTraderId.get(traderId) ?? null;
  }

  private async getTraderDeposits(periodId: string, traderId: string): Promise<any[]> {
    return this.prisma.deposit.findMany({
      where: {
        investment_period_id: periodId,
        trader_id: traderId,
        status: { in: this.settlementEligibleDepositStatuses as any },
      },
      select: {
        deposit_id: true,
        user_id: true,
        investment_period_id: true,
        trader_id: true,
        trader_main_address_id: true,
        network: true,
        asset_symbol: true,
        confirmed_amount: true,
        requested_amount: true,
        source_address: true,
        source_address_display: true,
        return_address: true,
        return_address_display: true,
        ton_deposit_memo: true,
        return_memo: true,
        settlement_preference: true,
        auto_renew_trader_id_snapshot: true,
        auto_renew_network_snapshot: true,
        auto_renew_asset_symbol_snapshot: true,
        rolled_over_into_deposit_id: true,
        rollover_source_deposit_id: true,
        rollover_attempted_at: true,
        rollover_block_reason: true,
        user: {
          select: {
            user_id: true,
            username: true,
            display_name: true,
          },
        },
      },
      orderBy: { created_at: 'asc' },
    } as any);
  }

  private getDefaultTraderReportInput(deposits: any[]): UpsertPeriodTraderReportDto {
    const startingBalanceUsdt = deposits.reduce((sum, deposit) => (
      sum + (this.parseOptionalDecimal(deposit.confirmed_amount) ?? this.parseOptionalDecimal(deposit.requested_amount) ?? 0)
    ), 0);

    return {
      ending_balance_usdt: this.round2(startingBalanceUsdt),
      trader_fee_percent: 40,
      network_fees_json: {
        TRON: 0,
        TON: 0,
        BSC: 0,
      },
    };
  }

  private async getReferralRewardTotals(periodId: string, depositIds: string[]) {
    const totals = new Map<string, {
      firstDeposit: number;
      periodProfit: number;
      total: number;
    }>();

    if (depositIds.length === 0) {
      return totals;
    }

    const rewards = await (this.prisma as any).referralReward.findMany({
      where: {
        investment_period_id: periodId,
        source_deposit_id: { in: depositIds },
      },
      select: {
        source_deposit_id: true,
        reward_type: true,
        reward_amount: true,
      },
    });

    for (const reward of rewards) {
      const key = reward.source_deposit_id;
      const entry = totals.get(key) ?? { firstDeposit: 0, periodProfit: 0, total: 0 };
      const amount = this.parseOptionalDecimal(reward.reward_amount) ?? 0;

      if (reward.reward_type === 'FIRST_DEPOSIT') {
        entry.firstDeposit = this.round2(entry.firstDeposit + amount);
      } else if (reward.reward_type === 'PERIOD_PROFIT') {
        entry.periodProfit = this.round2(entry.periodProfit + amount);
      }

      entry.total = this.round2(entry.firstDeposit + entry.periodProfit);
      totals.set(key, entry);
    }

    return totals;
  }

  private aggregateReferralPreviewTotals(
    projectedRewards: Array<{ source_deposit_id: string; reward_type: string; reward_amount: number }>,
    depositIds: string[],
  ) {
    const totals = new Map<string, {
      firstDeposit: number;
      periodProfit: number;
      total: number;
    }>();
    const allowedDepositIds = new Set(depositIds);

    for (const reward of projectedRewards) {
      if (!allowedDepositIds.has(reward.source_deposit_id)) {
        continue;
      }

      const entry = totals.get(reward.source_deposit_id) ?? { firstDeposit: 0, periodProfit: 0, total: 0 };
      const amount = this.round2(Number(reward.reward_amount ?? 0));

      if (reward.reward_type === 'FIRST_DEPOSIT') {
        entry.firstDeposit = this.round2(entry.firstDeposit + amount);
      } else if (reward.reward_type === 'PERIOD_PROFIT') {
        entry.periodProfit = this.round2(entry.periodProfit + amount);
      }

      entry.total = this.round2(entry.firstDeposit + entry.periodProfit);
      totals.set(reward.source_deposit_id, entry);
    }

    return totals;
  }

  private async getTraderMetricsSummary(periodId: string, traderId: string) {
    const snapshot = await (this.prisma as any).traderPeriodLiveMetrics.findUnique({
      where: {
        trader_id_investment_period_id: {
          trader_id: traderId,
          investment_period_id: periodId,
        },
      },
    });

    if (!snapshot) {
      return null;
    }

    return {
      source_type: snapshot.source_type ?? null,
      trade_count: snapshot.trade_count ?? 0,
      profit_percent: this.parseOptionalDecimal(snapshot.profit_percent) ?? 0,
      win_rate: this.parseOptionalDecimal(snapshot.win_rate) ?? 0,
      captured_at: snapshot.captured_at?.toISOString() ?? null,
    };
  }

  private async getTraderRegistrySummary(reportId: string | null) {
    if (!reportId) {
      return {
        payout_registry_id: null,
        exists: false,
        row_count: 0,
        terminal_row_count: 0,
        pending_row_count: 0,
      };
    }

    const registry = await (this.prisma as any).payoutRegistry.findUnique({
      where: { trader_report_id: reportId },
      include: {
        rows: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!registry) {
      return {
        payout_registry_id: null,
        exists: false,
        row_count: 0,
        terminal_row_count: 0,
        pending_row_count: 0,
      };
    }

    const terminalStatuses = new Set(['PAID_MANUAL', 'PAID_BATCH', 'FAILED', 'SKIPPED']);
    const rowCount = (registry.rows ?? []).length;
    const terminalRowCount = (registry.rows ?? []).filter((row: any) => terminalStatuses.has(row.status)).length;

    return {
      payout_registry_id: registry.payout_registry_id,
      exists: true,
      row_count: rowCount,
      terminal_row_count: terminalRowCount,
      pending_row_count: rowCount - terminalRowCount,
    };
  }

  private async materializeSettlementOutcomesForPublishedTraderReport(report: any): Promise<void> {
    const deposits = await this.getTraderDeposits(report.investment_period_id, report.trader_id);
    const publishedReports = await (this.prisma as any).profitLossReport.findMany({
      where: {
        report_reference: report.trader_report_id,
        status: ReportStatus.PUBLISHED,
      },
      select: {
        report_id: true,
        deposit_id: true,
        payout_amount: true,
      },
    });

    const reportByDepositId = new Map<string, any>();
    for (const item of publishedReports) {
      reportByDepositId.set(item.deposit_id, item);
    }

    for (const deposit of deposits) {
      if (deposit.rollover_attempted_at || deposit.rolled_over_into_deposit_id) {
        continue;
      }

      const depositReport = reportByDepositId.get(deposit.deposit_id);
      if (!depositReport) {
        continue;
      }

      await this.applySettlementOutcomeForDeposit(deposit, depositReport);
    }
  }

  private async applySettlementOutcomeForDeposit(deposit: any, depositReport: any): Promise<void> {
    const payoutAmount = this.parseOptionalDecimal(depositReport.payout_amount) ?? 0;
    const principalAmount = this.parseOptionalDecimal(deposit.confirmed_amount) ?? this.parseOptionalDecimal(deposit.requested_amount) ?? 0;
    const normalizedPayoutAmount = Math.max(this.round2(payoutAmount), 0);
    const normalizedPrincipalAmount = Math.max(this.round2(Math.min(principalAmount, normalizedPayoutAmount)), 0);
    const profitAmount = this.round2(Math.max(normalizedPayoutAmount - normalizedPrincipalAmount, 0));
    const settlementPreference = deposit.settlement_preference ?? 'WITHDRAW_ALL';
    const snapshots = {
      auto_renew_trader_id_snapshot: deposit.trader_id ?? null,
      auto_renew_network_snapshot: deposit.network,
      auto_renew_asset_symbol_snapshot: deposit.asset_symbol,
      rollover_attempted_at: new Date(),
      rollover_block_reason: null,
    };

    if (settlementPreference === 'WITHDRAW_ALL') {
      await this.creditHeldCycleBalance(deposit.user_id, deposit.network, normalizedPayoutAmount);
      await this.prisma.deposit.update({
        where: { deposit_id: deposit.deposit_id },
        data: snapshots as any,
      });
      return;
    }

    const desiredRolloverAmount = settlementPreference === 'REINVEST_ALL'
      ? normalizedPayoutAmount
      : normalizedPrincipalAmount;
    const heldAmount = settlementPreference === 'REINVEST_ALL' ? 0 : profitAmount;
    const nextPeriod = desiredRolloverAmount > 0
      ? await this.findNextEligiblePeriod(deposit.investment_period_id, deposit.network, deposit.asset_symbol)
      : null;

    if (!nextPeriod || desiredRolloverAmount <= 0) {
      const blockedAmount = settlementPreference === 'REINVEST_ALL'
        ? normalizedPayoutAmount
        : this.round2(normalizedPrincipalAmount + heldAmount);
      await this.creditHeldCycleBalance(deposit.user_id, deposit.network, blockedAmount);
      await this.prisma.deposit.update({
        where: { deposit_id: deposit.deposit_id },
        data: {
          ...snapshots,
          rollover_block_reason: desiredRolloverAmount <= 0 ? 'NO_REINVESTABLE_AMOUNT' : 'NO_ELIGIBLE_NEXT_PERIOD',
        } as any,
      });
      return;
    }

    const childDeposit = await this.prisma.deposit.create({
      data: {
        user_id: deposit.user_id,
        investment_period_id: nextPeriod.investment_period_id,
        trader_id: deposit.trader_id,
        trader_main_address_id: deposit.trader_main_address_id,
        network: deposit.network,
        asset_symbol: deposit.asset_symbol,
        deposit_route: `dr_${randomUUID().replace(/-/g, '')}`,
        source_address: deposit.source_address,
        return_address: deposit.return_address ?? null,
        ton_deposit_memo: deposit.ton_deposit_memo ?? null,
        return_memo: deposit.return_memo ?? null,
        requested_amount: desiredRolloverAmount.toString(),
        confirmed_amount: desiredRolloverAmount.toString(),
        confirmation_count: 1,
        status: 'ACTIVE',
        confirmed_at: new Date(),
        activated_at: new Date(),
        settlement_preference: deposit.settlement_preference ?? 'WITHDRAW_ALL',
        rollover_source_deposit_id: deposit.deposit_id,
      } as any,
    });

    if (heldAmount > 0) {
      await this.creditHeldCycleBalance(deposit.user_id, deposit.network, heldAmount);
    }

    await this.prisma.deposit.update({
      where: { deposit_id: deposit.deposit_id },
      data: {
        ...snapshots,
        rolled_over_into_deposit_id: childDeposit.deposit_id,
      } as any,
    });
  }

  private async findNextEligiblePeriod(currentPeriodId: string, network: string, assetSymbol: string): Promise<any | null> {
    const candidatePeriods = await this.prisma.investmentPeriod.findMany({
      where: {
        investment_period_id: { not: currentPeriodId },
        status: { in: [InvestmentPeriodStatus.ACTIVE, InvestmentPeriodStatus.DRAFT] },
        accepted_networks: { has: network },
        accepted_assets: { has: assetSymbol },
      } as any,
      orderBy: { start_date: 'asc' },
    } as any);

    return candidatePeriods[0] ?? null;
  }

  private async creditHeldCycleBalance(userId: string, network: string, amount: number): Promise<void> {
    if (amount <= 0) {
      return;
    }

    const fieldName = network === 'TON' ? 'held_cycle_balance_ton' : 'held_cycle_balance_bsc';
    const user = await (this.prisma as any).user.findUnique({
      where: { user_id: userId },
      select: { [fieldName]: true },
    });
    const currentBalance = this.parseOptionalDecimal(user?.[fieldName]) ?? 0;

    await (this.prisma as any).user.update({
      where: { user_id: userId },
      data: {
        [fieldName]: this.round2(currentBalance + amount).toFixed(2),
      },
    });
  }

  private async ensurePeriodExists(id: string): Promise<void> {
    const period = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
      select: { investment_period_id: true },
    });

    if (!period) {
      throw new NotFoundException('Investment period not found');
    }
  }

  private serialize(period: any) {
    return {
      ...period,
      start_date: period.start_date.toISOString(),
      end_date: period.end_date.toISOString(),
      lock_date: period.lock_date?.toISOString() || null,
      created_at: period.created_at.toISOString(),
      updated_at: period.updated_at.toISOString(),
    };
  }

  private serializeTraderReport(report: any, required: boolean): PeriodTraderReportDto {
    return {
      trader_report_id: report.trader_report_id,
      investment_period_id: report.investment_period_id,
      trader_id: report.trader_id,
      trader_nickname: report.trader.nickname,
      trader_slug: report.trader.slug,
      trader_display_name: report.trader.display_name,
      status: report.status,
      required,
      ending_balance_usdt: parseFloat(report.ending_balance_usdt.toString()),
      trader_fee_percent: parseFloat(report.trader_fee_percent.toString()),
      network_fees_json: (report.network_fees_json as Record<string, number>) ?? {},
      generated_by: report.generated_by ?? null,
      approved_by: report.approved_by ?? null,
      approved_at: report.approved_at?.toISOString() ?? null,
      published_at: report.published_at?.toISOString() ?? null,
      created_at: report.created_at.toISOString(),
      updated_at: report.updated_at.toISOString(),
    };
  }

  private serializePayoutRegistry(registry: any): PayoutRegistryDto {
    return {
      payout_registry_id: registry.payout_registry_id,
      investment_period_id: registry.investment_period_id,
      trader_report_id: registry.trader_report_id,
      trader_id: registry.trader_id,
      generated_by: registry.generated_by ?? null,
      created_at: registry.created_at.toISOString(),
      updated_at: (registry.updated_at ?? registry.created_at).toISOString(),
      rows: (registry.rows ?? []).map((row: any) => this.serializePayoutRegistryRow(row)),
    };
  }

  private serializePayoutRegistryRow(row: any) {
    const depositUser = row.deposit?.user ?? null;
    const defaultPayoutAddress = this.resolveRegistryRowAddress(row, 'default_payout_address');
    const selectedPayoutAddress = this.resolveRegistryRowAddress(row, 'selected_payout_address');

    return {
      payout_registry_row_id: row.payout_registry_row_id,
      payout_registry_id: row.payout_registry_id,
      investment_period_id: row.investment_period_id,
      trader_report_id: row.trader_report_id,
      deposit_id: row.deposit_id,
      trader_id: row.trader_id,
      trader_nickname: row.trader_nickname,
      user_id: row.deposit?.user_id ?? null,
      user_label: this.buildUserLabel(depositUser),
      network: row.network,
      asset_symbol: row.asset_symbol,
      deposit_amount_usdt: parseFloat(row.deposit_amount_usdt.toString()),
      share_ratio: parseFloat(row.share_ratio.toString()),
      payout_gross_usdt: parseFloat(row.payout_gross_usdt.toString()),
      payout_fee_usdt: parseFloat(row.payout_fee_usdt.toString()),
      payout_net_usdt: parseFloat(row.payout_net_usdt.toString()),
      default_payout_address: defaultPayoutAddress,
      selected_payout_address: selectedPayoutAddress,
      address_source: row.address_source,
      status: row.status,
      tx_hash: row.tx_hash ?? null,
      paid_at: row.paid_at?.toISOString() ?? null,
      failure_reason: row.failure_reason ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at.toISOString(),
      updated_at: (row.updated_at ?? row.created_at).toISOString(),
    };
  }

  private buildTraderReportPreview(
    periodId: string,
    trader: any,
    deposits: any[],
    dto: UpsertPeriodTraderReportDto,
    options?: {
      report?: PeriodTraderReportDto | null;
      referralMode?: 'PROJECTED' | 'MATERIALIZED';
      referralTotals?: Map<string, { firstDeposit: number; periodProfit: number; total: number }>;
      metricsSummary?: {
        source_type: string | null;
        trade_count: number;
        profit_percent: number;
        win_rate: number;
        captured_at: string | null;
      } | null;
      registrySummary?: {
        payout_registry_id: string | null;
        exists: boolean;
        row_count: number;
        terminal_row_count: number;
        pending_row_count: number;
      };
    },
  ): PeriodTraderReportPreviewDto {
    const normalizedDeposits = deposits.map((deposit) => {
      const depositAmountUsdt = parseFloat((deposit.confirmed_amount ?? deposit.requested_amount ?? 0).toString());
      return {
        ...deposit,
        deposit_amount_usdt: depositAmountUsdt,
      };
    });

    const totalDepositsUsdt = normalizedDeposits.reduce((sum, deposit) => sum + deposit.deposit_amount_usdt, 0);
    const endingBalanceUsdt = dto.ending_balance_usdt;
    const traderFeePercent = dto.trader_fee_percent ?? 40;
    const networkFees = dto.network_fees_json ?? {};
    const grossPnlUsdt = endingBalanceUsdt - totalDepositsUsdt;
    const traderFeeUsdt = grossPnlUsdt > 0 ? grossPnlUsdt * traderFeePercent / 100 : 0;
    const totalNetworkFeesUsdt = Object.values(networkFees).reduce((sum, fee) => sum + Number(fee || 0), 0);
    const netDistributableUsdt = endingBalanceUsdt - traderFeeUsdt - totalNetworkFeesUsdt;

    const networkTotals = new Map<string, number>();
    for (const deposit of normalizedDeposits) {
      networkTotals.set(
        deposit.network,
        (networkTotals.get(deposit.network) ?? 0) + deposit.deposit_amount_usdt,
      );
    }

    const rows = normalizedDeposits.map((deposit) => {
      const shareRatio = totalDepositsUsdt > 0 ? deposit.deposit_amount_usdt / totalDepositsUsdt : 0;
      const payoutGrossUsdt = netDistributableUsdt * shareRatio;
      const networkTotal = networkTotals.get(deposit.network) ?? 0;
      const payoutFeeUsdt = networkTotal > 0
        ? Number(networkFees[deposit.network] ?? 0) * (deposit.deposit_amount_usdt / networkTotal)
        : 0;
      const selectedPayoutAddress = this.resolveDepositDisplayPayoutAddress(deposit);
      const addressSource = deposit.return_address
        ? 'RETURN_ADDRESS'
        : deposit.source_address
          ? 'SOURCE_ADDRESS'
          : 'MANUAL_OVERRIDE';
      const referralTotals = options?.referralTotals?.get(deposit.deposit_id) ?? {
        firstDeposit: 0,
        periodProfit: 0,
        total: 0,
      };

      return {
        deposit_id: deposit.deposit_id,
        user_id: deposit.user_id,
        user_label: this.buildUserLabel(deposit.user),
        network: deposit.network,
        asset_symbol: deposit.asset_symbol,
        deposit_amount_usdt: this.round2(deposit.deposit_amount_usdt),
        confirmed_amount_usdt: this.round2(deposit.deposit_amount_usdt),
        share_ratio: this.round6(shareRatio),
        payout_gross_usdt: this.round2(payoutGrossUsdt),
        payout_fee_usdt: this.round2(payoutFeeUsdt),
        payout_net_usdt: this.round2(payoutGrossUsdt - payoutFeeUsdt),
        default_payout_address: selectedPayoutAddress,
        selected_payout_address: selectedPayoutAddress,
        address_source: addressSource,
        referral_first_deposit_usdt: this.round2(referralTotals.firstDeposit),
        referral_period_profit_usdt: this.round2(referralTotals.periodProfit),
        referral_reward_total_usdt: this.round2(referralTotals.total),
      };
    });

    const metricsSummary = options?.metricsSummary
      ? {
        ...options.metricsSummary,
        pnl: this.round2(grossPnlUsdt),
      }
      : null;

    return {
      investment_period_id: periodId,
      trader_id: trader.trader_id,
      trader_nickname: trader.nickname,
      trader_slug: trader.slug,
      trader_display_name: trader.display_name,
      referral_mode: options?.referralMode ?? 'MATERIALIZED',
      report: options?.report ?? null,
      deposit_count: normalizedDeposits.length,
      starting_balance_usdt: this.round2(totalDepositsUsdt),
      ending_balance_usdt: this.round2(endingBalanceUsdt),
      realized_profit_usdt: this.round2(grossPnlUsdt),
      period_balance_before_fees_usdt: this.round2(totalDepositsUsdt + grossPnlUsdt),
      trader_fee_percent: this.round2(traderFeePercent),
      total_deposits_usdt: this.round2(totalDepositsUsdt),
      gross_pnl_usdt: this.round2(grossPnlUsdt),
      trader_fee_usdt: this.round2(traderFeeUsdt),
      network_fees_json: {
        TRON: this.round2(Number(networkFees.TRON ?? 0)),
        TON: this.round2(Number(networkFees.TON ?? 0)),
        BSC: this.round2(Number(networkFees.BSC ?? 0)),
      },
      total_network_fees_usdt: this.round2(totalNetworkFeesUsdt),
      net_distributable_usdt: this.round2(netDistributableUsdt),
      metrics_summary: metricsSummary,
      registry_summary: options?.registrySummary ?? {
        payout_registry_id: null,
        exists: false,
        row_count: 0,
        terminal_row_count: 0,
        pending_row_count: 0,
      },
      rows,
    };
  }

  private buildUserLabel(user: { user_id?: string; username?: string | null; display_name?: string | null } | null | undefined) {
    if (!user) {
      return 'Unknown user';
    }

    if (user.display_name) {
      return user.display_name;
    }

    if (user.username) {
      return `@${user.username}`;
    }

    return user.user_id ?? 'Unknown user';
  }

  private async materializeDepositReportsFromTraderReport(report: any): Promise<void> {
    const deposits = await this.getTraderDeposits(report.investment_period_id, report.trader_id);
    const preview = this.buildTraderReportPreview(report.investment_period_id, report.trader, deposits, {
      ending_balance_usdt: parseFloat(report.ending_balance_usdt?.toString() ?? '0'),
      trader_fee_percent: parseFloat(report.trader_fee_percent?.toString() ?? '40'),
      network_fees_json: (report.network_fees_json as Record<string, number>) ?? {},
    });

    for (const row of preview.rows) {
      const grossResult = this.round2(row.payout_gross_usdt - row.deposit_amount_usdt);
      const feeAmount = this.round2(row.payout_fee_usdt);
      const netResult = this.round2(row.payout_net_usdt - row.deposit_amount_usdt);
      const payoutAmount = this.round2(row.payout_net_usdt);

      await (this.prisma as any).profitLossReport.upsert({
        where: { deposit_id: row.deposit_id },
        create: {
          deposit_id: row.deposit_id,
          gross_result: grossResult.toString(),
          fee_amount: feeAmount.toString(),
          net_result: netResult.toString(),
          payout_amount: payoutAmount.toString(),
          calculation_method: 'TRADER_PERIOD_REPORT_ALLOCATION',
          report_reference: report.trader_report_id,
          generated_by: report.generated_by ?? null,
          approved_by: report.approved_by ?? null,
          approved_at: report.approved_at ?? null,
          published_at: report.published_at ?? null,
          status: ReportStatus.PUBLISHED,
        },
        update: {
          gross_result: grossResult.toString(),
          fee_amount: feeAmount.toString(),
          net_result: netResult.toString(),
          payout_amount: payoutAmount.toString(),
          calculation_method: 'TRADER_PERIOD_REPORT_ALLOCATION',
          report_reference: report.trader_report_id,
          generated_by: report.generated_by ?? null,
          approved_by: report.approved_by ?? null,
          approved_at: report.approved_at ?? null,
          published_at: report.published_at ?? null,
          status: ReportStatus.PUBLISHED,
        },
      });
    }
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private round6(value: number): number {
    return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  }

  private resolveDepositDisplayPayoutAddress(deposit: any): string | null {
    if (deposit.return_address) {
      return deposit.return_address_display ?? deposit.return_address ?? null;
    }

    if (deposit.source_address) {
      return deposit.source_address_display ?? deposit.source_address ?? null;
    }

    return null;
  }

  private resolveRegistryRowAddress(
    row: any,
    field: 'default_payout_address' | 'selected_payout_address',
  ): string | null {
    if (row.address_source === 'MANUAL_OVERRIDE') {
      return row[field] ?? null;
    }

    if (row.address_source === 'RETURN_ADDRESS') {
      return row.deposit?.return_address_display ?? row.deposit?.return_address ?? row[field] ?? null;
    }

    if (row.address_source === 'SOURCE_ADDRESS') {
      return row.deposit?.source_address_display ?? row.deposit?.source_address ?? row[field] ?? null;
    }

    return row[field] ?? null;
  }

  private parseOptionalDecimal(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    return parseFloat(value.toString());
  }
}
