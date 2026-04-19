import { Module } from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { AdminDepositsController } from './admin-deposits.controller';
import { TradersModule } from '../traders/traders.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [TradersModule, WalletsModule],
  providers: [DepositsService],
  controllers: [DepositsController, AdminDepositsController],
  exports: [DepositsService],
})
export class DepositsModule {}
