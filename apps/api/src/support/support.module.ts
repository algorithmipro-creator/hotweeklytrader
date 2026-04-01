import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';

@Module({
  providers: [SupportService],
  controllers: [SupportController, AdminSupportController],
  exports: [SupportService],
})
export class SupportModule {}
