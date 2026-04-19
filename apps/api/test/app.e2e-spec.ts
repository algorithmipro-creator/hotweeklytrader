import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    it('GET returns empty array when no periods', () => {
      return request(app.getHttpServer())
        .get('/api/v1/periods')
        .expect(200)
        .expect([]);
    });
  });
});
