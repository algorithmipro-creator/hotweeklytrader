import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PendingReferralsService } from '../referrals/pending-referrals.service';
import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  const webAppSecretHex = createHmac('sha256', 'WebAppData').update('test-bot-token').digest('hex');

  function createSignedInitData(overrides?: {
    id?: number;
    username?: string;
    authDate?: number;
    queryId?: string;
    startParam?: string;
  }) {
    const botToken = 'test-bot-token';
    const user = {
      id: overrides?.id ?? 123456,
      first_name: 'Test',
      last_name: 'User',
      username: overrides?.username ?? 'tester',
    };
    const entries = [
      ['auth_date', String(overrides?.authDate ?? Math.floor(Date.now() / 1000))],
      ['query_id', overrides?.queryId ?? `query-${Math.random()}`],
      ['user', JSON.stringify(user)],
    ];
    if (overrides?.startParam) {
      entries.push(['start_param', overrides.startParam]);
    }

    const dataCheckString = [...entries]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return `${entries.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&')}&hash=${hash}`;
  }

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockPendingReferralsService = {
    findActivePendingReferral: jest.fn(),
    consumePendingReferral: jest.fn(),
  };

  const mockJwt = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'telegram.webAppSecret') return webAppSecretHex;
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
        { provide: PendingReferralsService, useValue: mockPendingReferralsService },
      ],
    }).compile();

    service = (module as any).get(AuthService);
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.user.create.mockReset();
    mockPrisma.user.upsert.mockReset();
    mockPendingReferralsService.findActivePendingReferral.mockReset();
    mockPendingReferralsService.consumePendingReferral.mockReset();
    mockPendingReferralsService.findActivePendingReferral.mockResolvedValue(null);
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'telegram.webAppSecret') return webAppSecretHex;
      if (key === 'jwt.secret') return 'test-secret';
      if (key === 'jwt.expiresIn') return '1h';
      if (key === 'admin.webLogin') return 'owner';
      if (key === 'admin.webPassword') return 'secret-pass';
      if (key === 'admin.ownerTelegramId') return '5021881120';
      return null;
    });
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

    it('rejects validation when the derived Telegram WebApp secret is missing', () => {
      mockConfig.get.mockImplementation((key: string) => {
        if (key === 'telegram.webAppSecret') return '';
        if (key === 'jwt.secret') return 'test-secret';
        return null;
      });

      expect(() => service['validateTelegramInitData'](createSignedInitData())).toThrow('Telegram WebApp secret not configured');
    });
  });

  describe('authenticateTelegram abuse protection', () => {
    it('creates a random immutable referral code and attributes a first signup from a valid referral code', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as jest.SpyInstance;
      randomBytesSpy.mockReturnValue(Buffer.from('0123456789ab', 'hex') as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'referrer-1',
        telegram_id: BigInt(998877),
        referral_code: 'REFCODE01',
      });
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });

      await service.authenticateTelegram(createSignedInitData(), {
        ip: '127.0.0.1',
        referralCode: 'REFCODE01',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { referral_code: 'REFCODE01' },
        select: { user_id: true, telegram_id: true },
      });
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({
          referral_code: '0123456789AB',
          referred_by_user_id: 'referrer-1',
          referred_at: expect.any(Date),
          referral_source: 'telegram_startapp',
        }),
        update: expect.not.objectContaining({
          referral_code: expect.any(String),
        }),
      }));
      randomBytesSpy.mockRestore();
    });

    it('normalizes lowercase referral codes before lookup', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as jest.SpyInstance;
      randomBytesSpy.mockReturnValue(Buffer.from('0123456789ab', 'hex') as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'referrer-1',
        telegram_id: BigInt(998877),
        referral_code: 'REFCODE01',
      });
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });

      await service.authenticateTelegram(createSignedInitData(), {
        ip: '127.0.0.1',
        referralCode: '  refcode01  ',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { referral_code: 'REFCODE01' },
        select: { user_id: true, telegram_id: true },
      });
      randomBytesSpy.mockRestore();
    });

    it('falls back to the signed start_param when the frontend does not pass referralCode', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as jest.SpyInstance;
      randomBytesSpy.mockReturnValue(Buffer.from('0123456789ab', 'hex') as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'referrer-1',
        telegram_id: BigInt(998877),
        referral_code: 'REFCODE01',
      });
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });

      await service.authenticateTelegram(createSignedInitData({
        startParam: 'ref_refcode01',
      }), {
        ip: '127.0.0.1',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { referral_code: 'REFCODE01' },
        select: { user_id: true, telegram_id: true },
      });
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({
          referred_by_user_id: 'referrer-1',
          referral_source: 'telegram_startapp',
        }),
      }));
      randomBytesSpy.mockRestore();
    });

    it('falls back to a pending referral captured by the bot when initData has no referral code', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as jest.SpyInstance;
      randomBytesSpy.mockReturnValue(Buffer.from('0123456789ab', 'hex') as any);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          user_id: 'referrer-1',
          telegram_id: BigInt(998877),
          referral_code: 'REFCODE01',
        });
      mockPendingReferralsService.findActivePendingReferral.mockResolvedValue({
        pending_referral_attribution_id: 'pending-1',
        telegram_id: BigInt(123456),
        referral_code: 'REFCODE01',
        source: 'telegram_menu_button',
        consumed_at: null,
      });
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });

      await service.authenticateTelegram(createSignedInitData(), {
        ip: '127.0.0.1',
      });

      expect(mockPendingReferralsService.findActivePendingReferral).toHaveBeenCalledWith(BigInt(123456));
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({
          referred_by_user_id: 'referrer-1',
          referral_source: 'telegram_pending_start',
        }),
      }));
      expect(mockPendingReferralsService.consumePendingReferral).toHaveBeenCalledWith('pending-1', 'user-1');
      randomBytesSpy.mockRestore();
    });

    it('does not overwrite existing attribution on later auth', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as jest.SpyInstance;
      randomBytesSpy.mockReturnValue(Buffer.from('0123456789ab', 'hex') as any);
      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'referrer-1',
        telegram_id: BigInt(998877),
        referral_code: 'REFCODE01',
      });
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
        referred_by_user_id: 'original-referrer',
        referred_at: new Date('2026-04-01T00:00:00.000Z'),
        referral_source: 'telegram_startapp',
      });

      await service.authenticateTelegram(createSignedInitData(), {
        ip: '127.0.0.1',
        referralCode: 'REFCODE01',
      });

      const [payload] = mockPrisma.user.upsert.mock.calls[0];
      expect(payload.update).not.toHaveProperty('referral_code');
      expect(payload.update).not.toHaveProperty('referred_by_user_id');
      expect(payload.update).not.toHaveProperty('referred_at');
      expect(payload.update).not.toHaveProperty('referral_source');
      randomBytesSpy.mockRestore();
    });

    it('avoids self-referral when the referral code belongs to the same telegram user', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as jest.SpyInstance;
      randomBytesSpy.mockReturnValue(Buffer.from('0123456789ab', 'hex') as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        referral_code: 'SELF01',
      });
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });

      await service.authenticateTelegram(createSignedInitData(), {
        ip: '127.0.0.1',
        referralCode: 'SELF01',
      });

      expect(mockPrisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
        create: expect.objectContaining({
          referral_code: '0123456789AB',
          referred_by_user_id: null,
          referred_at: null,
          referral_source: null,
        }),
      }));
      randomBytesSpy.mockRestore();
    });

    it('allows retrying the same initData if persistence fails after validation', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as jest.SpyInstance;
      randomBytesSpy.mockReturnValue(Buffer.from('0123456789ab', 'hex') as any);
      const initData = createSignedInitData({ queryId: 'retry-after-db-failure' });

      mockPrisma.user.upsert.mockRejectedValueOnce(new Error('database temporarily unavailable'));
      mockPrisma.user.upsert.mockResolvedValueOnce({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });

      await expect(service.authenticateTelegram(initData, { ip: '127.0.0.1' }))
        .rejects.toThrow('database temporarily unavailable');

      await expect(service.authenticateTelegram(initData, { ip: '127.0.0.1' }))
        .resolves.toEqual(expect.objectContaining({
          user: expect.objectContaining({ user_id: 'user-1' }),
        }));

      expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(2);
      randomBytesSpy.mockRestore();
    });

    it('blocks a concurrent duplicate initData while the first request is still in flight', async () => {
      const randomBytesSpy = jest.spyOn(crypto, 'randomBytes') as jest.SpyInstance;
      randomBytesSpy.mockReturnValue(Buffer.from('0123456789ab', 'hex') as any);
      const initData = createSignedInitData({ queryId: 'concurrent-replay' });

      let resolveFirstUpsert: ((value: any) => void) | undefined;
      const firstUpsert = new Promise((resolve) => {
        resolveFirstUpsert = resolve;
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'referrer-1',
        telegram_id: BigInt(998877),
        referral_code: 'REFCODE01',
      });
      mockPrisma.user.upsert.mockReturnValue(firstUpsert);

      const firstRequest = service.authenticateTelegram(initData, { ip: '127.0.0.1' });
      await Promise.resolve();

      await expect(service.authenticateTelegram(initData, { ip: '127.0.0.1' }))
        .rejects.toThrow('Telegram initData was already used');

      resolveFirstUpsert?.({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });

      await expect(firstRequest).resolves.toEqual(expect.objectContaining({
        user: expect.objectContaining({ user_id: 'user-1' }),
      }));
      randomBytesSpy.mockRestore();
    });

    it('signs JWT with the persisted user role instead of hardcoding USER', async () => {
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'admin-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'ADMIN',
      });

      await service.authenticateTelegram(createSignedInitData(), { ip: '127.0.0.1' });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'admin-1',
          role: 'ADMIN',
        }),
      );
    });

    it('rejects repeated auth bursts after the configured threshold', async () => {
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });

      for (let index = 0; index < 5; index += 1) {
        await service.authenticateTelegram(
          createSignedInitData({ queryId: `burst-${index}` }),
          { ip: '127.0.0.1' },
        );
      }

      await expect(service.authenticateTelegram(
        createSignedInitData({ queryId: 'burst-6' }),
        { ip: '127.0.0.1' },
      )).rejects.toThrow('Too many requests');
    });

    it('rejects replayed initData payloads', async () => {
      mockPrisma.user.upsert.mockResolvedValue({
        user_id: 'user-1',
        telegram_id: BigInt(123456),
        username: 'tester',
        display_name: 'Test User',
        status: 'ACTIVE',
        role: 'USER',
      });
      const initData = createSignedInitData({ queryId: 'replay-test' });

      await service.authenticateTelegram(initData, { ip: '127.0.0.1' });

      await expect(service.authenticateTelegram(initData, { ip: '127.0.0.1' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('authenticateAdminPassword', () => {
    it('returns a JWT for the configured owner admin user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        user_id: 'owner-admin',
        telegram_id: BigInt(5021881120),
        username: 'architect',
        display_name: 'The Architect',
        status: 'ACTIVE',
        role: 'SUPER_ADMIN',
      });

      const response = await service.authenticateAdminPassword('owner', 'secret-pass');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegram_id: BigInt('5021881120') },
      });
      expect(response.user.role).toBe('SUPER_ADMIN');
      expect(mockJwt.sign).toHaveBeenCalledWith(expect.objectContaining({
        sub: 'owner-admin',
        role: 'SUPER_ADMIN',
      }));
    });

    it('rejects invalid admin credentials', async () => {
      await expect(service.authenticateAdminPassword('owner', 'wrong-pass'))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
