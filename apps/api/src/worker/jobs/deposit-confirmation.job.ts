import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DepositsService } from '../../deposits/deposits.service';

@Injectable()
export class DepositConfirmationJob {
  private readonly logger = new Logger(DepositConfirmationJob.name);

  constructor(
    private prisma: PrismaService,
    private depositsService: DepositsService,
  ) {}

  async execute(depositId: string): Promise<void> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit) {
      this.logger.warn(`Deposit ${depositId} not found for confirmation check`);
      return;
    }

    if (deposit.status !== 'CONFIRMING') {
      this.logger.debug(`Deposit ${depositId} is not in CONFIRMING state`);
      return;
    }

    if (deposit.confirmation_count >= deposit.min_required_confirmations) {
      await this.depositsService.transition(depositId, 'CONFIRMED');
      await this.depositsService.transition(depositId, 'ACTIVE');
      this.logger.log(`Deposit ${depositId} confirmed and activated`);
    }
  }
}
