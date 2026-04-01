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
});
