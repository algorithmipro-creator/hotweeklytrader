import { Test } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { EvmWatcherService } from './networks/evm-watcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { DepositsService } from '../deposits/deposits.service';

describe('BlockchainService', () => {
  let service: BlockchainService;

  const mockEvmWatcher = {
    getNetworkName: jest.fn().mockReturnValue('BSC'),
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn().mockReturnValue(true),
    getLatestBlock: jest.fn().mockResolvedValue(0),
    checkTransaction: jest.fn(),
  };

  const mockPrisma = {
    transactionLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockDeposits = {
    findOneByRoute: jest.fn(),
    transition: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BlockchainService,
        { provide: EvmWatcherService, useValue: mockEvmWatcher },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: DepositsService, useValue: mockDeposits },
      ],
    }).compile();

    service = (module as any).get(BlockchainService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getWatcherForNetwork', () => {
    it('should return EVM watcher for BSC', () => {
      const watcher = service['getWatcherForNetwork']('BSC');
      expect(watcher).toBeDefined();
    });
  });
});
