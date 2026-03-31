import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportDto } from './dto/report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('deposit/:depositId')
  async findByDeposit(
    @Param('depositId') depositId: string,
    @CurrentUser() user: any,
  ): Promise<ReportDto | null> {
    const deposit = await (this.reportsService as any).prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit || deposit.user_id !== user.user_id) {
      return null;
    }

    return this.reportsService.findByDeposit(depositId);
  }
}
