import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AdminAuditController } from './admin-audit.controller';

@Module({
  providers: [AuditService],
  controllers: [AdminAuditController],
  exports: [AuditService],
})
export class AuditModule {}
