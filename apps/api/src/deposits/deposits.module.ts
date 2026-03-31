import { Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { AdminDepositsController } from './admin-deposits.controller';

@Module({
  providers: [DepositsService],
  controllers: [DepositsController, AdminDepositsController],
  exports: [DepositsService],
})
export class DepositsModule {}
