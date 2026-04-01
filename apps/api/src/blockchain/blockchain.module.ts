import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { EvmWatcherService } from './networks/evm-watcher.service';
import { DepositsModule } from '../deposits/deposits.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DepositsModule, NotificationsModule],
  providers: [BlockchainService, EvmWatcherService],
  exports: [BlockchainService, EvmWatcherService],
})
export class BlockchainModule {}
