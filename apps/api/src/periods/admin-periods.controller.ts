import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PeriodsService } from './periods.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import {
  BulkPayoutRegistryUpdateDto,
  CreatePeriodDto,
  PayoutRegistryDto,
  PeriodDto,
  PeriodCompletionReadinessDto,
  PeriodTraderReportDto,
  PeriodTraderReportPreviewDto,
  PeriodTraderReportSummaryDto,
  UpdatePeriodDto,
  UpdatePayoutRegistryRowDto,
  UpsertPeriodTraderReportDto,
} from './dto/period.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/periods')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminPeriodsController {
  constructor(private periodsService: PeriodsService) {}

  @Get()
  async findAll(@Query('status') status?: string): Promise<PeriodDto[]> {
    if (status) {
      return this.periodsService.findAll(status);
    }

    const periods = await (this.periodsService as any).prisma.investmentPeriod.findMany({
      orderBy: { start_date: 'asc' },
    });

    return periods.map((period: any) => (this.periodsService as any).serialize(period));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PeriodDto> {
    return this.periodsService.findOne(id);
  }

  @Get(':id/trader-reports')
  async listTraderReports(@Param('id') id: string): Promise<PeriodTraderReportSummaryDto[]> {
    return this.periodsService.listTraderReports(id);
  }

  @Get(':id/trader-reports/:traderId/builder')
  async getTraderReportBuilder(
    @Param('id') id: string,
    @Param('traderId') traderId: string,
  ): Promise<PeriodTraderReportPreviewDto> {
    return this.periodsService.getTraderReportBuilder(id, traderId);
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
    @Body('status') status: string,
  ): Promise<PeriodDto> {
    return this.periodsService.updateStatus(id, status);
  }

  @Get(':id/completion-readiness')
  async getCompletionReadiness(@Param('id') id: string): Promise<PeriodCompletionReadinessDto> {
    return this.periodsService.getPeriodCompletionReadiness(id);
  }

  @Put(':id/trader-reports/:traderId')
  async upsertTraderReportDraft(
    @Param('id') id: string,
    @Param('traderId') traderId: string,
    @Body() dto: UpsertPeriodTraderReportDto,
    @CurrentUser() user: any,
  ): Promise<PeriodTraderReportDto> {
    return this.periodsService.upsertTraderReportDraft(id, traderId, dto, user.user_id);
  }

  @Post(':id/trader-reports/:traderId/preview')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async previewTraderReport(
    @Param('id') id: string,
    @Param('traderId') traderId: string,
    @Body() dto: UpsertPeriodTraderReportDto,
  ): Promise<PeriodTraderReportPreviewDto> {
    return this.periodsService.previewTraderReport(id, traderId, dto);
  }

  @Put(':id/trader-reports/report/:reportId/submit')
  async submitTraderReportForApproval(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
  ): Promise<PeriodTraderReportDto> {
    return this.periodsService.submitTraderReportForApproval(id, reportId);
  }

  @Put(':id/trader-reports/report/:reportId/approve')
  async approveTraderReport(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
    @CurrentUser() user: any,
  ): Promise<PeriodTraderReportDto> {
    return this.periodsService.approveTraderReport(id, reportId, user.user_id);
  }

  @Put(':id/trader-reports/report/:reportId/publish')
  async publishTraderReport(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
  ): Promise<PeriodTraderReportDto> {
    return this.periodsService.publishTraderReport(id, reportId);
  }

  @Post(':id/trader-reports/report/:reportId/registry')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async generateTraderPayoutRegistry(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
    @CurrentUser() user: any,
  ): Promise<PayoutRegistryDto> {
    return this.periodsService.generateTraderPayoutRegistry(id, reportId, user.user_id);
  }

  @Get(':id/trader-reports/report/:reportId/registry')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getTraderPayoutRegistry(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
  ): Promise<PayoutRegistryDto | null> {
    return this.periodsService.getTraderPayoutRegistry(id, reportId);
  }

  @Get(':id/trader-reports/report/:reportId/export.csv')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async exportTraderReportCsv(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
  ): Promise<string> {
    return this.periodsService.exportTraderReportCsv(id, reportId);
  }

  @Put('payout-registry-rows/:rowId')
  async updatePayoutRegistryRow(
    @Param('rowId') rowId: string,
    @Body() dto: UpdatePayoutRegistryRowDto,
  ) {
    return this.periodsService.updatePayoutRegistryRow(rowId, dto);
  }

  @Post('payout-registries/:registryId/mark-remaining-paid')
  async markRemainingPayoutRegistryRowsAsPaid(
    @Param('registryId') registryId: string,
    @Body('notes') notes?: string,
  ): Promise<BulkPayoutRegistryUpdateDto> {
    return this.periodsService.markRemainingPayoutRegistryRowsAsPaid(registryId, notes);
  }
}
