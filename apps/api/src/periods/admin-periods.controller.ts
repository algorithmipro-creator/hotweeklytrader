import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PeriodsService } from './periods.service';
import { PeriodAnalyticsService } from './period-analytics.service';
import { PeriodSettlementService } from './period-settlement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  CreatePeriodDto,
  UpdatePeriodDto,
  PeriodDto,
  PeriodStatus,
  PeriodSettlementInputDto,
  ApprovePeriodSettlementDto,
  PeriodSettlementPreviewDto,
  PeriodSettlementSnapshotDto,
} from './dto/period.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/periods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPeriodsController {
  constructor(
    private periodsService: PeriodsService,
    private analyticsService: PeriodAnalyticsService,
    private settlementService: PeriodSettlementService,
  ) {}

  @Get()
  async findAll(@Query('status') status?: string): Promise<PeriodDto[]> {
    const periods = await this.periodsService.findAll(status || 'ALL');
    const summaries = await this.analyticsService.getSummaries(
      periods.map((period: any) => period.investment_period_id),
    );

    return periods.map((period: any) => ({
      ...period,
      ...this.serializeSummary(summaries[period.investment_period_id]),
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PeriodDto> {
    const period = await this.periodsService.findOne(id);
    const settlementSnapshot = await this.settlementService.getSnapshot(id);
    return {
      ...period,
      ...this.serializeSummary(await this.analyticsService.getSummary(period.investment_period_id)),
      settlement_snapshot: settlementSnapshot,
    };
  }

  @Post(':id/settlement/preview')
  async previewSettlement(
    @Param('id') id: string,
    @Body() dto: PeriodSettlementInputDto,
  ): Promise<PeriodSettlementPreviewDto> {
    return this.settlementService.preview(id, dto);
  }

  @Post(':id/settlement/approve')
  async approveSettlement(
    @Param('id') id: string,
    @Body() dto: ApprovePeriodSettlementDto,
    @CurrentUser() user: any,
  ): Promise<PeriodSettlementSnapshotDto> {
    return this.settlementService.approve(id, dto, user.user_id);
  }

  @Post()
  async create(
    @Body() dto: CreatePeriodDto,
    @CurrentUser() user: any,
  ): Promise<PeriodDto> {
    return this.periodsService.create(dto, user.user_id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePeriodDto,
  ): Promise<PeriodDto> {
    return this.periodsService.update(id, dto);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: PeriodStatus,
  ): Promise<PeriodDto> {
    return this.periodsService.updateStatus(id, status);
  }

  private serializeSummary(summary: any) {
    return {
      depositCount: summary.depositCount,
      totalDepositedUsdt: this.toNumber(summary.totalDepositedUsdt),
      averageDepositUsdt: this.toNumber(summary.averageDepositUsdt),
    };
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }
}
