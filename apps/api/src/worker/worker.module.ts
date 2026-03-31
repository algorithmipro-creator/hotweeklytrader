import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { DepositConfirmationJob } from './jobs/deposit-confirmation.job';
import { PeriodCompletionJob } from './jobs/period-completion.job';
import { DepositsModule } from '../deposits/deposits.module';

@Module({
  imports: [DepositsModule],
  providers: [WorkerService, DepositConfirmationJob, PeriodCompletionJob],
  exports: [WorkerService],
})
export class WorkerModule {}
