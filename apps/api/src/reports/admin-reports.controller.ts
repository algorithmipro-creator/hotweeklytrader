import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateReportDto, UpdateReportDto, ReportDto } from './dto/report.dto';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;

    const reports = await (this.reportsService as any).prisma.profitLossReport.findMany({
      where,
      orderBy: { generated_at: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
    });

    return reports.map((r: any) => ({
      ...r,
      gross_result: parseFloat(r.gross_result.toString()),
      fee_amount: parseFloat(r.fee_amount.toString()),
      net_result: parseFloat(r.net_result.toString()),
      payout_amount: parseFloat(r.payout_amount.toString()),
      generated_at: r.generated_at.toISOString(),
      approved_at: r.approved_at?.toISOString() || null,
      published_at: r.published_at?.toISOString() || null,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ReportDto> {
    const report = await (this.reportsService as any).prisma.profitLossReport.findUnique({
      where: { report_id: id },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return (this.reportsService as any).serialize(report);
  }

  @Post()
  async create(
    @Body() dto: CreateReportDto,
    @CurrentUser() user: any,
  ): Promise<ReportDto> {
    return this.reportsService.create(dto, user.user_id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReportDto,
  ): Promise<ReportDto> {
    return this.reportsService.update(id, dto);
  }

  @Put(':id/submit')
  async submitForApproval(@Param('id') id: string): Promise<ReportDto> {
    return this.reportsService.submitForApproval(id);
  }

  @Put(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ReportDto> {
    return this.reportsService.approve(id, user.user_id);
  }

  @Put(':id/publish')
  async publish(@Param('id') id: string): Promise<ReportDto> {
    return this.reportsService.publish(id);
  }
}
