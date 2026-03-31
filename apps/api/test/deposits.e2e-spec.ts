import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Deposits API (e2e)', () => {
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

  describe('/api/v1/deposits', () => {
    it('GET returns 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/deposits')
        .expect(401);
    });

    it('POST rejects invalid body without auth', () => {
      return request(app.getHttpServer())
        .post('/api/v1/deposits')
        .send({})
        .expect(401);
    });
  });

  describe('/api/v1/admin/deposits', () => {
    it('GET returns 401 without auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/admin/deposits')
        .expect(401);
    });
  });
});
