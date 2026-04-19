import { Test } from '@nestjs/testing';
import { WorkerService } from './worker.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WorkerService', () => {
  let service: WorkerService;

  const mockPrisma = {
    systemJob: {
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkerService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = (module as any).get(WorkerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
