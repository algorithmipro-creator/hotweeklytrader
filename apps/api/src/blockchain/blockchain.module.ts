import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { EvmWatcherService } from './networks/evm-watcher.service';
import { DepositsModule } from '../deposits/deposits.module';

@Module({
  imports: [DepositsModule],
  providers: [BlockchainService, EvmWatcherService],
  exports: [BlockchainService, EvmWatcherService],
})
export class BlockchainModule {}
