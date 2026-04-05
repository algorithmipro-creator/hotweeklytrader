import { Test } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('SupportService', () => {
  let service: SupportService;

  const mockPrisma = {
    supportCase: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(SupportService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should throw if case not found', async () => {
      mockPrisma.supportCase.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('includes lightweight user identity for admin support views', async () => {
      mockPrisma.supportCase.findMany.mockResolvedValue([
        {
          case_id: 'case-1',
          user_id: 'user-1',
          related_deposit_id: 'dep-1',
          category: 'deposit',
          priority: 'HIGH',
          status: 'OPEN',
          assigned_to: null,
          opened_reason: 'Transfer missing',
          resolution_summary: null,
          created_at: new Date('2026-04-05T00:00:00.000Z'),
          updated_at: new Date('2026-04-05T00:00:00.000Z'),
          resolved_at: null,
          user: {
            display_name: 'Alice',
            username: 'alice',
            telegram_id: BigInt(123456789),
          },
        },
      ]);
      mockPrisma.supportCase.count.mockResolvedValue(1);

      await expect(service.findAll({})).resolves.toEqual({
        cases: [
          expect.objectContaining({
            case_id: 'case-1',
            user_display_name: 'Alice',
            user_username: 'alice',
            user_telegram_id: '123456789',
          }),
        ],
        total: 1,
      });
    });
  });
});
