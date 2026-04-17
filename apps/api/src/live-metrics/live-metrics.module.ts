import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InternalLiveMetricsController } from './internal-live-metrics.controller';
import { LiveMetricsController } from './live-metrics.controller';
import { LiveMetricsService } from './live-metrics.service';

@Module({
  imports: [PrismaModule],
  controllers: [InternalLiveMetricsController, LiveMetricsController],
  providers: [LiveMetricsService],
  exports: [LiveMetricsService],
})
export class LiveMetricsModule {}

