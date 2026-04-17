import { InternalLiveMetricsController } from './internal-live-metrics.controller';

describe('InternalLiveMetricsController', () => {
  it('accepts bridge ingestion and returns the upserted snapshot', async () => {
    const liveMetricsService = {
      upsertSnapshot: jest.fn().mockResolvedValue({
        trader_id: 'trader-1',
        investment_period_id: 'period-1',
        source_type: 'MT5',
        profit_percent: '10.00',
        trade_count: 11,
        win_rate: '72.73',
        captured_at: new Date('2026-04-17T14:00:00.000Z'),
      }),
    };

    const controller = new InternalLiveMetricsController(liveMetricsService as any);

    const result = await controller.ingest({
      trader_id: 'trader-1',
      investment_period_id: 'period-1',
      source_type: 'MT5',
      profit_percent: '10.00',
      trade_count: 11,
      win_rate: '72.73',
      captured_at: '2026-04-17T14:00:00.000Z',
    });

    expect(result.profit_percent).toBe('10.00');
  });
});

