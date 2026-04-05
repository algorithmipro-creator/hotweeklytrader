import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DepositStatus, PayoutStatus, ReportStatus } from '@prisma/client';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  async getStats() {
    const [
      activeDeposits,
      pendingReview,
      pendingPayouts,
      pendingReports,
      totalUsers,
    ] = await Promise.all([
      this.prisma.deposit.count({ where: { status: DepositStatus.ACTIVE } }),
      this.prisma.deposit.count({ where: { status: DepositStatus.MANUAL_REVIEW } }),
      this.prisma.payout.count({ where: { status: PayoutStatus.PENDING_APPROVAL } }),
      this.prisma.profitLossReport.count({ where: { status: ReportStatus.PENDING_APPROVAL } }),
      this.prisma.user.count(),
    ]);

    return {
      activeDeposits,
      pendingReview,
      pendingPayouts,
      pendingReports,
      totalUsers,
    };
  }
}
