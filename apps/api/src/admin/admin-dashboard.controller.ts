import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminDashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async getStats() {
    const [
      activeDeposits,
      pendingReview,
      pendingPayouts,
      pendingReports,
      totalUsers,
    ] = await Promise.all([
      this.prisma.deposit.count({ where: { status: 'ACTIVE' as any } }),
      this.prisma.deposit.count({ where: { status: 'MANUAL_REVIEW' as any } }),
      this.prisma.payout.count({ where: { status: 'PENDING_APPROVAL' as any } }),
      this.prisma.profitLossReport.count({ where: { status: 'PENDING_APPROVAL' as any } }),
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
