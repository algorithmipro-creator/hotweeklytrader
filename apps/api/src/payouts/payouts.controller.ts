import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PayoutDto } from './dto/payout.dto';

@Controller('payouts')
@UseGuards(JwtAuthGuard)
export class PayoutsController {
  constructor(private payoutsService: PayoutsService) {}

  @Get('deposit/:depositId')
  async findByDeposit(
    @Param('depositId') depositId: string,
    @CurrentUser() user: any,
  ): Promise<PayoutDto[]> {
    const deposit = await (this.payoutsService as any).prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit || deposit.user_id !== user.user_id) {
      return [];
    }

    return this.payoutsService.findByDeposit(depositId);
  }
}
