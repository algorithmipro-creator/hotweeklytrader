import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto, UpdateReportDto, ReportDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findByDeposit(depositId: string): Promise<ReportDto | null> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    const report = await this.prisma.profitLossReport.findUnique({
      where: { deposit_id: depositId },
    });

    if (!report) return null;
    return this.serialize(report);
  }

  async create(dto: CreateReportDto, generatedBy: string): Promise<ReportDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: dto.deposit_id },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== 'COMPLETED') {
      throw new BadRequestException('Can only create reports for completed deposits');
    }

    const existing = await this.prisma.profitLossReport.findUnique({
      where: { deposit_id: dto.deposit_id },
    });

    if (existing) {
      throw new BadRequestException('Report already exists for this deposit');
    }

    const feeAmount = dto.fee_amount || 0;
    const netResult = dto.gross_result - feeAmount;
    const payoutAmount = parseFloat(deposit.confirmed_amount?.toString() || '0') + netResult;

    const report = await this.prisma.profitLossReport.create({
      data: {
        deposit_id: dto.deposit_id,
        gross_result: dto.gross_result.toString(),
        fee_amount: feeAmount.toString(),
        net_result: netResult.toString(),
        payout_amount: payoutAmount.toString(),
        calculation_method: dto.calculation_method || null,
        report_file_url: dto.report_file_url || null,
        generated_by: generatedBy,
        status: 'DRAFT',
      },
    });

    return this.serialize(report);
  }

  async update(reportId: string, dto: UpdateReportDto): Promise<ReportDto> {
    const report = await this.prisma.profitLossReport.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status === 'PUBLISHED') {
      throw new BadRequestException('Cannot update a published report');
    }

    const grossResult = dto.gross_result ?? parseFloat(report.gross_result.toString());
    const feeAmount = dto.fee_amount ?? parseFloat(report.fee_amount.toString());
    const netResult = grossResult - feeAmount;

    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: report.deposit_id },
    });

    const payoutAmount = parseFloat(deposit?.confirmed_amount?.toString() || '0') + netResult;

    const updated = await this.prisma.profitLossReport.update({
      where: { report_id: reportId },
      data: {
        gross_result: grossResult.toString(),
        fee_amount: feeAmount.toString(),
        net_result: netResult.toString(),
        payout_amount: payoutAmount.toString(),
        calculation_method: dto.calculation_method ?? report.calculation_method,
        report_file_url: dto.report_file_url ?? report.report_file_url,
        status: 'REVISED',
      },
    });

    return this.serialize(updated);
  }

  async submitForApproval(reportId: string): Promise<ReportDto> {
    const report = await this.prisma.profitLossReport.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'DRAFT' && report.status !== 'REVISED') {
      throw new BadRequestException('Report must be in DRAFT or REVISED status');
    }

    const updated = await this.prisma.profitLossReport.update({
      where: { report_id: reportId },
      data: { status: 'PENDING_APPROVAL' },
    });

    return this.serialize(updated);
  }

  async approve(reportId: string, approvedBy: string): Promise<ReportDto> {
    const report = await this.prisma.profitLossReport.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Report must be pending approval');
    }

    if (report.generated_by === approvedBy) {
      throw new BadRequestException('Cannot approve your own report (separation of duties)');
    }

    const updated = await this.prisma.profitLossReport.update({
      where: { report_id: reportId },
      data: {
        status: 'APPROVED',
        approved_by: approvedBy,
        approved_at: new Date(),
      },
    });

    return this.serialize(updated);
  }

  async publish(reportId: string): Promise<ReportDto> {
    const report = await this.prisma.profitLossReport.findUnique({
      where: { report_id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== 'APPROVED') {
      throw new BadRequestException('Report must be approved before publishing');
    }

    const updated = await this.prisma.profitLossReport.update({
      where: { report_id: reportId },
      data: {
        status: 'PUBLISHED',
        published_at: new Date(),
      },
    });

    await this.prisma.deposit.update({
      where: { deposit_id: report.deposit_id },
      data: { status: 'REPORT_READY' },
    });

    return this.serialize(updated);
  }

  private serialize(report: any): ReportDto {
    return {
      report_id: report.report_id,
      deposit_id: report.deposit_id,
      gross_result: parseFloat(report.gross_result.toString()),
      fee_amount: parseFloat(report.fee_amount.toString()),
      net_result: parseFloat(report.net_result.toString()),
      payout_amount: parseFloat(report.payout_amount.toString()),
      calculation_method: report.calculation_method,
      report_file_url: report.report_file_url,
      report_reference: report.report_reference,
      generated_at: report.generated_at.toISOString(),
      approved_at: report.approved_at?.toISOString() || null,
      published_at: report.published_at?.toISOString() || null,
      generated_by: report.generated_by,
      approved_by: report.approved_by,
      status: report.status,
    };
  }
}
