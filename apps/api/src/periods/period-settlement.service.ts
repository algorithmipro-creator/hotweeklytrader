import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InvestmentPeriodStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PeriodSettlementInputDto,
  PeriodSettlementPreviewDto,
  PeriodSettlementSnapshotDto,
} from './dto/period.dto';
import { PeriodAnalyticsService } from './period-analytics.service';

const DEFAULT_TRADER_FEE_PERCENT = 40;

@Injectable()
export class PeriodSettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: PeriodAnalyticsService,
  ) {}

  async getSnapshot(periodId: string): Promise<PeriodSettlementSnapshotDto | null> {
    const snapshot = await this.prisma.periodSettlementSnapshot.findUnique({
      where: { investment_period_id: periodId },
    });

    return snapshot ? this.serializeSnapshot(periodId, snapshot) : null;
  }

  async preview(periodId: string, dto: PeriodSettlementInputDto): Promise<PeriodSettlementPreviewDto> {
    await this.assertReportingPeriod(periodId);
    return this.buildPreview(periodId, dto);
  }

  async approve(
    periodId: string,
    dto: PeriodSettlementInputDto,
    approvedBy?: string | null,
  ): Promise<PeriodSettlementSnapshotDto> {
    const existing = await this.prisma.periodSettlementSnapshot.findUnique({
      where: { investment_period_id: periodId },
    });

    if (existing) {
      return this.serializeSnapshot(periodId, existing);
    }

    await this.assertReportingPeriod(periodId);
    const preview = await this.buildPreview(periodId, dto);
    const now = new Date();

    const snapshot = await this.prisma.periodSettlementSnapshot.create({
      data: {
        investment_period_id: periodId,
        ending_balance_usdt: new Prisma.Decimal(preview.endingBalanceUsdt),
        total_deposits_usdt: new Prisma.Decimal(preview.totalDepositsUsdt),
        gross_pnl_usdt: new Prisma.Decimal(preview.grossPnlUsdt),
        trader_fee_percent: preview.traderFeePercent,
        trader_fee_usdt: new Prisma.Decimal(preview.traderFeeUsdt),
        network_fees_json: preview.networkFeesUsdt,
        net_distributable_usdt: new Prisma.Decimal(preview.netDistributableUsdt),
        calculated_at: now,
        approved_at: now,
        approved_by: approvedBy || null,
      },
    });

    return this.serializeSnapshot(periodId, snapshot);
  }

  private async buildPreview(
    periodId: string,
    dto: PeriodSettlementInputDto,
  ): Promise<PeriodSettlementPreviewDto> {
    const summary = await this.analyticsService.getSummary(periodId);
    const traderFeePercent = dto.trader_fee_percent ?? DEFAULT_TRADER_FEE_PERCENT;
    const endingBalanceUsdt = dto.ending_balance_usdt;
    const networkFeesUsdt = {
      TRON: dto.tron_network_fee_usdt ?? 0,
      TON: dto.ton_network_fee_usdt ?? 0,
      BSC: dto.bsc_network_fee_usdt ?? 0,
    };
    const totalNetworkFeesUsdt = networkFeesUsdt.TRON + networkFeesUsdt.TON + networkFeesUsdt.BSC;
    const grossPnlUsdt = endingBalanceUsdt - summary.totalDepositedUsdt;
    const traderFeeUsdt = grossPnlUsdt > 0 ? (grossPnlUsdt * traderFeePercent) / 100 : 0;
    const netDistributableUsdt = endingBalanceUsdt - traderFeeUsdt - totalNetworkFeesUsdt;

    return {
      investment_period_id: periodId,
      totalDepositsUsdt: summary.totalDepositedUsdt,
      endingBalanceUsdt,
      grossPnlUsdt,
      traderFeePercent,
      traderFeeUsdt,
      netDistributableUsdt,
      networkFeesUsdt,
    };
  }

  private async assertReportingPeriod(periodId: string) {
    const period = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Investment period not found');
    }

    if (period.status !== InvestmentPeriodStatus.REPORTING) {
      throw new BadRequestException('Settlement is only available while the period is REPORTING');
    }
  }

  private serializeSnapshot(periodId: string, snapshot: any): PeriodSettlementSnapshotDto {
    return {
      investment_period_id: periodId,
      settlement_snapshot_id: snapshot.settlement_snapshot_id,
      totalDepositsUsdt: this.toNumber(snapshot.total_deposits_usdt),
      endingBalanceUsdt: this.toNumber(snapshot.ending_balance_usdt),
      grossPnlUsdt: this.toNumber(snapshot.gross_pnl_usdt),
      traderFeePercent: snapshot.trader_fee_percent,
      traderFeeUsdt: this.toNumber(snapshot.trader_fee_usdt),
      netDistributableUsdt: this.toNumber(snapshot.net_distributable_usdt),
      networkFeesUsdt: this.normalizeFees(snapshot.network_fees_json),
      calculated_at: snapshot.calculated_at.toISOString(),
      approved_at: snapshot.approved_at?.toISOString() || null,
      approved_by: snapshot.approved_by || null,
    };
  }

  private normalizeFees(value: Prisma.JsonValue): PeriodSettlementSnapshotDto['networkFeesUsdt'] {
    const fees = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    return {
      TRON: this.coerceNumber(fees.TRON),
      TON: this.coerceNumber(fees.TON),
      BSC: this.coerceNumber(fees.BSC),
    };
  }

  private coerceNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value) || 0;
    return 0;
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }
}
