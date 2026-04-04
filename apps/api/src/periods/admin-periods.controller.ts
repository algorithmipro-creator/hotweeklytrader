import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodAnalyticsService } from './period-analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePeriodDto, UpdatePeriodDto, PeriodDto, PeriodStatus } from './dto/period.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/periods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPeriodsController {
  private analyticsService: PeriodAnalyticsService;

  constructor(private periodsService: PeriodsService) {
    this.analyticsService = new PeriodAnalyticsService((this.periodsService as any).prisma);
  }

  @Get()
  async findAll(@Query('status') status?: string): Promise<PeriodDto[]> {
    const periods = await this.periodsService.findAll(status || 'ALL');
    return Promise.all(periods.map((period: any) => this.enrichWithSummary(period)));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PeriodDto> {
    const period = await this.periodsService.findOne(id);
    return this.enrichWithSummary(period);
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

  private async enrichWithSummary(period: any): Promise<PeriodDto> {
    return {
      ...period,
      ...(await this.analyticsService.getSummary(period.investment_period_id)),
    };
  }
}
