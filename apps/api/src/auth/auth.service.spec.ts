import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

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
  });
});
