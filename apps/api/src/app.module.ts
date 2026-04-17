import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { ReportsModule } from './reports/reports.module';
import { PayoutsModule } from './payouts/payouts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SupportModule } from './support/support.module';
import { WalletsModule } from './wallets/wallets.module';
import { TradersModule } from './traders/traders.module';
import { ReferralsModule } from './referrals/referrals.module';
import { LiveMetricsModule } from './live-metrics/live-metrics.module';
import { AdminDashboardController } from './admin/admin-dashboard.controller';
import appConfig from './config/app.config';
import blockchainConfig from './config/blockchain.config';
import databaseConfig from './config/database.config';
import telegramConfig from './config/telegram.config';
import jwtConfig from './config/jwt.config';
import adminConfig from './config/admin.config';

@Module({
  controllers: [AdminDashboardController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, telegramConfig, jwtConfig, adminConfig, blockchainConfig],
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
    ReportsModule,
    PayoutsModule,
    NotificationsModule,
    SupportModule,
    WalletsModule,
    TradersModule,
    ReferralsModule,
    LiveMetricsModule,
  ],
})
export class AppModule {}
