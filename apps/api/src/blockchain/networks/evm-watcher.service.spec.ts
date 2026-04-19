import { Test } from '@nestjs/testing';
import { EvmWatcherService } from './evm-watcher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { DepositsService } from '../../deposits/deposits.service';
import { NotificationsService } from '../../notifications/notifications.service';

describe('EvmWatcherService', () => {
  let service: EvmWatcherService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'blockchain.bsc.rpcUrl') return 'https://bsc-dataseed.binance.org';
      if (key === 'blockchain.bsc.confirmationsRequired') return 12;
      return null;
    }),
  };

  const mockPrisma = {
    deposit: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    transactionLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockDepositsService = {
    markDetected: jest.fn(),
    confirmDeposit: jest.fn(),
  };

  const mockNotificationsService = {
    createForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EvmWatcherService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: DepositsService, useValue: mockDepositsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = (module as any).get(EvmWatcherService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return correct network name', () => {
    expect(service.getNetworkName()).toBe('BSC');
  });
});
