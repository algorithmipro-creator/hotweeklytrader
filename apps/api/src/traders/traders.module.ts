import { Module } from '@nestjs/common';
import { TradersService } from './traders.service';
import { TradersController } from './traders.controller';
import { AdminTradersController } from './admin-traders.controller';

@Module({
  providers: [TradersService],
  controllers: [TradersController, AdminTradersController],
  exports: [TradersService],
})
export class TradersModule {}
