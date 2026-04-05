import { ConfigService } from '@nestjs/config';
import { TronUsdtWatcherService } from './tron-usdt-watcher.service';

describe('TronUsdtWatcherService', () => {
  let service: TronUsdtWatcherService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'blockchain.tron.confirmationsRequired') return 19;
      if (key === 'blockchain.tron.depositAddress') return 'TVPaJrwCFLV3jvVomcZL2U8PT59QSpeimZ';
      if (key === 'blockchain.tron.rpcUrl') return 'https://api.trongrid.io';
      return null;
    }),
  };

  const mockPrisma = {
    deposit: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockDepositsService = {
    transition: jest.fn(),
  };

  const mockNotificationsService = {
    send: jest.fn(),
  };

  beforeEach(() => {
    service = new TronUsdtWatcherService(
      mockPrisma as any,
      mockDepositsService as any,
      mockNotificationsService as any,
      mockConfig as unknown as ConfigService,
    );

    jest.clearAllMocks();
  });

  it('tracks TRON as the watcher network', () => {
    expect(service.getNetworkName()).toBe('TRON');
  });

  it('processes incoming TRC20 USDT transfers only once per matching source address', async () => {
    mockPrisma.deposit.findMany.mockResolvedValue([
      { deposit_id: 'tron-deposit-1', source_address: 'ta_source_1', status: 'AWAITING_TRANSFER' },
      { deposit_id: 'tron-deposit-2', source_address: 'ta_source_2', status: 'CONFIRMING' },
    ]);

    jest.spyOn(service as any, 'getCurrentBlockNumber').mockResolvedValue(1000);
    const fetchTransfersSpy = jest.spyOn(service as any, 'fetchRecentUsdtTransfers').mockResolvedValue([
      {
        transaction_id: 'tron-tx-1',
        from: 'TA_SOURCE_1',
        to: 'TVPaJrwCFLV3jvVomcZL2U8PT59QSpeimZ',
        value: '125000000',
        block_timestamp: 1710000000000,
        block_number: 990,
        token_info: { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 },
      },
      {
        transaction_id: 'tron-tx-2',
        from: 'TA_OTHER',
        to: 'TVPaJrwCFLV3jvVomcZL2U8PT59QSpeimZ',
        value: '5000000',
        block_timestamp: 1710000001000,
        block_number: 999,
        token_info: { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', decimals: 6 },
      },
    ]);
    const processTransferSpy = jest.spyOn(service as any, 'processDetectedTransfer').mockResolvedValue(undefined);

    await (service as any).poll();

    expect(fetchTransfersSpy).toHaveBeenCalledTimes(1);
    expect(processTransferSpy).toHaveBeenCalledTimes(1);
    expect(processTransferSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: 'tron-tx-1',
        fromAddress: 'ta_source_1',
        toAddress: 'TVPaJrwCFLV3jvVomcZL2U8PT59QSpeimZ',
        amount: '125',
        confirmations: 10,
        network: 'TRON',
        tokenSymbol: 'USDT',
      }),
    );
  });

  it('formats raw TRON token values using token decimals', () => {
    expect((service as any).formatTokenAmount('125000000', 6)).toBe('125');
    expect((service as any).formatTokenAmount('1234500', 6)).toBe('1.2345');
  });

  it('matches a transfer to only one deterministic pending deposit', async () => {
    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'older-awaiting',
        user_id: 'user-1',
        source_address: 'ta_source_1',
        status: 'AWAITING_TRANSFER',
        tx_hash: null,
        created_at: new Date('2026-04-01T00:00:00.000Z'),
      },
      {
        deposit_id: 'newer-awaiting',
        user_id: 'user-2',
        source_address: 'ta_source_1',
        status: 'AWAITING_TRANSFER',
        tx_hash: null,
        created_at: new Date('2026-04-02T00:00:00.000Z'),
      },
    ]);
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 'user-1' });

    await (service as any).processDetectedTransfer({
      txHash: 'tron-tx-1',
      blockNumber: 100,
      fromAddress: 'ta_source_1',
      toAddress: 'TVPaJrwCFLV3jvVomcZL2U8PT59QSpeimZ',
      amount: '125',
      tokenSymbol: 'USDT',
      confirmations: 1,
      timestamp: new Date(),
      network: 'TRON',
      rawPayload: '{}',
    });

    expect(mockDepositsService.transition).toHaveBeenCalledTimes(1);
    expect(mockDepositsService.transition).toHaveBeenCalledWith('older-awaiting', 'DETECTED');
  });
});
