import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BscScanWatcherService } from './networks/bscscan-watcher.service';
import { TronUsdtWatcherService } from './networks/tron-usdt-watcher.service';
import { DepositsModule } from '../deposits/deposits.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DepositsModule, NotificationsModule],
  providers: [BlockchainService, BscScanWatcherService, TronUsdtWatcherService],
  exports: [BlockchainService, BscScanWatcherService, TronUsdtWatcherService],
})
export class BlockchainModule {}
