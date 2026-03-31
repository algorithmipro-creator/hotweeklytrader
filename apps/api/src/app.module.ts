import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PeriodsModule } from './periods/periods.module';
import { AuditModule } from './audit/audit.module';
import { DepositsModule } from './deposits/deposits.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { WorkerModule } from './worker/worker.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import telegramConfig from './config/telegram.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, telegramConfig, jwtConfig],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PeriodsModule,
    AuditModule,
    DepositsModule,
    BlockchainModule,
    ReconciliationModule,
    WorkerModule,
  ],
})
export class AppModule {}
