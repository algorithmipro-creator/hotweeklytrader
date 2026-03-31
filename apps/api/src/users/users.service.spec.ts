import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const mockUser = {
        user_id: 'test-id',
        telegram_id: BigInt(12345),
        username: 'testuser',
        display_name: 'Test User',
        language: 'en',
        status: 'ACTIVE',
        legal_ack_version: null,
        risk_ack_version: null,
        created_at: new Date(),
        last_login_at: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne('test-id');
      expect(result).toBeDefined();
      expect(result.user_id).toBe('test-id');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { user_id: 'test-id' },
        select: expect.any(Object),
      });
    });
  });
});
