import { Module } from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';
import { AdminPayoutsController } from './admin-payouts.controller';

@Module({
  providers: [PayoutsService],
  controllers: [PayoutsController, AdminPayoutsController],
  exports: [PayoutsService],
})
export class PayoutsModule {}
