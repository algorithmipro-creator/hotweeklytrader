import { Test } from '@nestjs/testing';
import { WorkerService } from './worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { PeriodCompletionJob } from './jobs/period-completion.job';

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

  const mockPeriodCompletionJob = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkerService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PeriodCompletionJob, useValue: mockPeriodCompletionJob },
      ],
    }).compile();

    service = (module as any).get(WorkerService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
