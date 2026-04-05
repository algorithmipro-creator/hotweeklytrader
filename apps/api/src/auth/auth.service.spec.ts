import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';

function signTelegramInitData(
  params: Record<string, string>,
  botToken: string,
): string {
  const searchParams = new URLSearchParams(params);
  const sortedParams = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(sortedParams).digest('hex');
  searchParams.set('hash', hash);
  return searchParams.toString();
}

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'telegram.botToken') return 'test-bot-token';
      if (key === 'telegram.adminTelegramIds') return ['5021881120'];
      if (key === 'telegram.initDataMaxAgeSeconds') return 300;
      if (key === 'jwt.secret') return 'test-secret';
      if (key === 'jwt.expiresIn') return '1h';
      return null;
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = (module as any).get(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateTelegramInitData', () => {
    it('should reject empty initData', () => {
      expect(() => service['validateTelegramInitData']('')).toThrow();
    });

    it('should reject initData without hash', () => {
      expect(() => service['validateTelegramInitData']('query_id=abc')).toThrow();
    });

    it('rejects stale initData based on auth_date', () => {
      const oldAuthDate = Math.floor(Date.now() / 1000) - 3600;
      const initData = signTelegramInitData({
        auth_date: String(oldAuthDate),
        query_id: 'query-1',
        user: JSON.stringify({
          id: 5021881120,
          first_name: 'Admin',
          username: 'architect',
        }),
      }, 'test-bot-token');

      expect(() => service['validateTelegramInitData'](initData)).toThrow('Telegram initData is too old');
    });
  });

  describe('authenticateTelegram', () => {
    it('issues ADMIN role for configured admin Telegram IDs', async () => {
      const authDate = Math.floor(Date.now() / 1000);
      const initData = signTelegramInitData({
        auth_date: String(authDate),
        query_id: 'query-2',
        user: JSON.stringify({
          id: 5021881120,
          first_name: 'The',
          last_name: 'Architect',
          username: 'Architect_7077',
        }),
      }, 'test-bot-token');

      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(5021881120),
        username: 'Architect_7077',
        display_name: 'The Architect',
        status: 'ACTIVE',
        role: 'ADMIN',
      });

      await service.authenticateTelegram(initData);

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ role: 'ADMIN' }),
          create: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' }),
      );
    });
  });
});
