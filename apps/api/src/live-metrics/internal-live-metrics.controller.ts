import { Body, Controller, Post } from '@nestjs/common';
import { LiveMetricsService } from './live-metrics.service';
import { UpsertTraderPeriodLiveMetricsDto } from './dto/live-metrics.dto';

@Controller('internal/trader-period-live-metrics')
export class InternalLiveMetricsController {
  constructor(private readonly liveMetricsService: LiveMetricsService) {}

  @Post()
  ingest(@Body() body: UpsertTraderPeriodLiveMetricsDto) {
    return this.liveMetricsService.upsertSnapshot(body);
  }
}

