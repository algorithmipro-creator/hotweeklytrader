import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PeriodsService } from '../src/periods/periods.service';

describe('API (e2e)', () => {
  let app: INestApplication;
  const mockPeriodsService = {
    findAll: jest.fn().mockResolvedValue([
      {
        investment_period_id: 'period-1',
        title: 'Funding Period',
        period_type: 'fixed',
        start_date: '2026-04-01T00:00:00.000Z',
        end_date: '2026-04-08T00:00:00.000Z',
        lock_date: null,
        status: 'FUNDING',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
        minimum_amount_rules: null,
        maximum_amount_rules: null,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      },
    ]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PeriodsService)
      .useValue(mockPeriodsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/v1/health', () => {
    it('GET returns ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('/api/v1/auth/telegram', () => {
    it('POST rejects empty initData', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: '' })
        .expect(400);
    });

    it('POST rejects missing hash', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/telegram')
        .send({ initData: 'query_id=test' })
        .expect(400);
    });
  });

  describe('/api/v1/periods', () => {
    it('GET returns funding periods for the public picker', () => {
      return request(app.getHttpServer())
        .get('/api/v1/periods')
        .expect(200)
        .expect((res) => {
          expect(mockPeriodsService.findAll).toHaveBeenCalledWith('FUNDING');
          expect(res.body).toHaveLength(1);
          expect(res.body[0].status).toBe('FUNDING');
        });
    });
  });
});
