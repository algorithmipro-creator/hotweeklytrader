import { Controller, Get, Param } from '@nestjs/common';
import { LiveMetricsService } from './live-metrics.service';

@Controller('deposits')
export class LiveMetricsController {
  constructor(private readonly liveMetricsService: LiveMetricsService) {}

  @Get(':depositId/live-metrics')
  getByDeposit(@Param('depositId') depositId: string) {
    return this.liveMetricsService.getSnapshotForDeposit(depositId);
  }
}

