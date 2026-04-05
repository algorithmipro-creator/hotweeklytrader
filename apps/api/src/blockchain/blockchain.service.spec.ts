import { Test } from '@nestjs/testing';
import { BlockchainService } from './blockchain.service';
import { BscScanWatcherService } from './networks/bscscan-watcher.service';
import { TonUsdtWatcherService } from './networks/ton-usdt-watcher.service';
import { TronUsdtWatcherService } from './networks/tron-usdt-watcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { DepositsService } from '../deposits/deposits.service';

describe('BlockchainService', () => {
  let service: BlockchainService;

  const mockBscWatcher = {
    getNetworkName: jest.fn().mockReturnValue('BSC'),
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn().mockReturnValue(true),
    getLatestBlock: jest.fn().mockResolvedValue(0),
    checkTransaction: jest.fn(),
  };

  const mockTronWatcher = {
    getNetworkName: jest.fn().mockReturnValue('TRON'),
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn().mockReturnValue(true),
    getLatestBlock: jest.fn().mockResolvedValue(0),
    checkTransaction: jest.fn(),
  };

  const mockTonWatcher = {
    getNetworkName: jest.fn().mockReturnValue('TON'),
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
        { provide: BscScanWatcherService, useValue: mockBscWatcher },
        { provide: TronUsdtWatcherService, useValue: mockTronWatcher },
        { provide: TonUsdtWatcherService, useValue: mockTonWatcher },
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
    it('should return watcher for BSC', () => {
      const watcher = service['getWatcherForNetwork']('BSC');
      expect(watcher).toBeDefined();
    });

    it('should return watcher for TRON', () => {
      const watcher = service['getWatcherForNetwork']('TRON');
      expect(watcher).toBeDefined();
    });

    it('should return watcher for TON', () => {
      const watcher = service['getWatcherForNetwork']('TON');
      expect(watcher).toBeDefined();
    });
  });
});
