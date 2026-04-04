import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { InvestmentPeriodStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApprovePeriodSettlementDto,
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
    const calculation = await this.buildCalculation(periodId, dto);
    return calculation.preview;
  }

  async approve(
    periodId: string,
    dto: ApprovePeriodSettlementDto,
    approvedBy?: string | null,
  ): Promise<PeriodSettlementSnapshotDto> {
    const existing = await this.prisma.periodSettlementSnapshot.findUnique({
      where: { investment_period_id: periodId },
    });

    if (existing) {
      return this.serializeSnapshot(periodId, existing);
    }

    await this.assertReportingPeriod(periodId);
    const calculation = await this.buildCalculation(periodId, dto);
    if (dto.preview_signature !== calculation.preview.preview_signature) {
      throw new BadRequestException('Settlement preview is stale. Please preview again before approving.');
    }
    const now = new Date();

    const snapshot = await this.prisma.periodSettlementSnapshot.upsert({
      where: { investment_period_id: periodId },
      create: {
        investment_period_id: periodId,
        ending_balance_usdt: calculation.decimals.endingBalanceUsdt,
        total_deposits_usdt: calculation.decimals.totalDepositsUsdt,
        gross_pnl_usdt: calculation.decimals.grossPnlUsdt,
        trader_fee_percent: calculation.preview.traderFeePercent,
        trader_fee_usdt: calculation.decimals.traderFeeUsdt,
        network_fees_json: calculation.preview.networkFeesUsdt,
        net_distributable_usdt: calculation.decimals.netDistributableUsdt,
        calculated_at: now,
        approved_at: now,
        approved_by: approvedBy || null,
      },
      update: {},
    });

    return this.serializeSnapshot(periodId, snapshot);
  }

  private async buildCalculation(
    periodId: string,
    dto: PeriodSettlementInputDto,
  ): Promise<{
    preview: PeriodSettlementPreviewDto;
    decimals: {
      endingBalanceUsdt: Prisma.Decimal;
      totalDepositsUsdt: Prisma.Decimal;
      grossPnlUsdt: Prisma.Decimal;
      traderFeeUsdt: Prisma.Decimal;
      netDistributableUsdt: Prisma.Decimal;
    };
  }> {
    const summary = await this.analyticsService.getSummary(periodId);
    const endingBalanceUsdt = this.requiredDecimal(dto.ending_balance_usdt, 'ending_balance_usdt');
    const totalDepositsUsdt = this.requiredDecimal(summary.totalDepositedUsdt, 'totalDepositedUsdt');
    const traderFeePercent = this.optionalPercent(dto.trader_fee_percent, DEFAULT_TRADER_FEE_PERCENT);
    const tronFee = this.optionalDecimal(dto.tron_network_fee_usdt, 'tron_network_fee_usdt');
    const tonFee = this.optionalDecimal(dto.ton_network_fee_usdt, 'ton_network_fee_usdt');
    const bscFee = this.optionalDecimal(dto.bsc_network_fee_usdt, 'bsc_network_fee_usdt');
    const networkFeesUsdt = {
      TRON: this.toNumber(tronFee),
      TON: this.toNumber(tonFee),
      BSC: this.toNumber(bscFee),
    };
    const totalNetworkFees = tronFee.add(tonFee).add(bscFee);
    const grossPnlUsdt = endingBalanceUsdt.sub(totalDepositsUsdt);
    const traderFeeUsdt = grossPnlUsdt.gt(0)
      ? grossPnlUsdt.mul(new Prisma.Decimal(traderFeePercent)).div(100)
      : new Prisma.Decimal(0);
    const netDistributableUsdt = endingBalanceUsdt.sub(traderFeeUsdt).sub(totalNetworkFees);
    const preview = {
      investment_period_id: periodId,
      totalDepositsUsdt: this.toNumber(totalDepositsUsdt),
      endingBalanceUsdt: this.toNumber(endingBalanceUsdt),
      grossPnlUsdt: this.toNumber(grossPnlUsdt),
      traderFeePercent,
      traderFeeUsdt: this.toNumber(traderFeeUsdt),
      netDistributableUsdt: this.toNumber(netDistributableUsdt),
      networkFeesUsdt,
      preview_signature: this.buildPreviewSignature({
        periodId,
        totalDepositsUsdt,
        endingBalanceUsdt,
        grossPnlUsdt,
        traderFeePercent,
        traderFeeUsdt,
        netDistributableUsdt,
        networkFeesUsdt: {
          TRON: tronFee,
          TON: tonFee,
          BSC: bscFee,
        },
      }),
    };

    return {
      preview,
      decimals: {
        endingBalanceUsdt,
        totalDepositsUsdt,
        grossPnlUsdt,
        traderFeeUsdt,
        netDistributableUsdt,
      },
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

  private optionalPercent(value: number | undefined, fallback: number): number {
    if (value == null) return fallback;
    if (!Number.isFinite(value)) {
      throw new BadRequestException('trader_fee_percent must be a valid number');
    }
    return value;
  }

  private optionalDecimal(value: number | undefined, fieldName: string): Prisma.Decimal {
    if (value == null) return new Prisma.Decimal(0);
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
    return new Prisma.Decimal(value);
  }

  private buildPreviewSignature(input: {
    periodId: string;
    totalDepositsUsdt: Prisma.Decimal;
    endingBalanceUsdt: Prisma.Decimal;
    grossPnlUsdt: Prisma.Decimal;
    traderFeePercent: number;
    traderFeeUsdt: Prisma.Decimal;
    netDistributableUsdt: Prisma.Decimal;
    networkFeesUsdt: {
      TRON: Prisma.Decimal;
      TON: Prisma.Decimal;
      BSC: Prisma.Decimal;
    };
  }): string {
    const payload = {
      periodId: input.periodId,
      totalDepositsUsdt: input.totalDepositsUsdt.toFixed(),
      endingBalanceUsdt: input.endingBalanceUsdt.toFixed(),
      grossPnlUsdt: input.grossPnlUsdt.toFixed(),
      traderFeePercent: input.traderFeePercent,
      traderFeeUsdt: input.traderFeeUsdt.toFixed(),
      netDistributableUsdt: input.netDistributableUsdt.toFixed(),
      networkFeesUsdt: {
        TRON: input.networkFeesUsdt.TRON.toFixed(),
        TON: input.networkFeesUsdt.TON.toFixed(),
        BSC: input.networkFeesUsdt.BSC.toFixed(),
      },
    };

    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  private requiredDecimal(value: Prisma.Decimal | number | undefined, fieldName: string): Prisma.Decimal {
    if (value == null) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
    if (value instanceof Prisma.Decimal) return value;
    if (!Number.isFinite(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }
    return new Prisma.Decimal(value);
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }
}
