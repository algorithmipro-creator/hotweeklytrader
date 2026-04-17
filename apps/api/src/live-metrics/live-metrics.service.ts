import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TraderPeriodLiveMetricsDto, UpsertTraderPeriodLiveMetricsDto } from './dto/live-metrics.dto';

@Injectable()
export class LiveMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertSnapshot(input: UpsertTraderPeriodLiveMetricsDto): Promise<TraderPeriodLiveMetricsDto> {
    const snapshot = await this.prisma.traderPeriodLiveMetrics.upsert({
      where: {
        trader_id_investment_period_id: {
          trader_id: input.trader_id,
          investment_period_id: input.investment_period_id,
        },
      },
      update: {
        source_type: input.source_type,
        profit_percent: input.profit_percent,
        trade_count: input.trade_count,
        win_rate: input.win_rate,
        captured_at: new Date(input.captured_at),
        raw_payload: input.raw_payload ?? undefined,
      },
      create: {
        trader_id: input.trader_id,
        investment_period_id: input.investment_period_id,
        source_type: input.source_type,
        profit_percent: input.profit_percent,
        trade_count: input.trade_count,
        win_rate: input.win_rate,
        captured_at: new Date(input.captured_at),
        raw_payload: input.raw_payload ?? undefined,
      },
    });

    return {
      trader_id: snapshot.trader_id,
      investment_period_id: snapshot.investment_period_id,
      source_type: snapshot.source_type,
      profit_percent: String(snapshot.profit_percent),
      trade_count: snapshot.trade_count,
      win_rate: String(snapshot.win_rate),
      captured_at: snapshot.captured_at,
      raw_payload: snapshot.raw_payload ?? undefined,
    };
  }
}
