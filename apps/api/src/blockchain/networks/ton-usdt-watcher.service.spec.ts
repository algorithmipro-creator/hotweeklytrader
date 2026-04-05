import { ConfigService } from '@nestjs/config';
import { TonUsdtWatcherService } from './ton-usdt-watcher.service';

describe('TonUsdtWatcherService', () => {
  let service: TonUsdtWatcherService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'blockchain.ton.confirmationsRequired') return 6;
      if (key === 'blockchain.ton.depositAddress') return 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a';
      if (key === 'blockchain.ton.rpcUrl') return 'https://toncenter.com';
      if (key === 'blockchain.ton.usdtMasterAddress') return 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';
      if (key === 'blockchain.ton.apiKey') return '';
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
    service = new TonUsdtWatcherService(
      mockPrisma as any,
      mockDepositsService as any,
      mockNotificationsService as any,
      mockConfig as unknown as ConfigService,
    );

    jest.clearAllMocks();
  });

  it('tracks TON as the watcher network', () => {
    expect(service.getNetworkName()).toBe('TON');
  });

  it('processes incoming TON USDT jetton transfers for matching source addresses', async () => {
    const friendlySourceAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const rawSourceAddress = (service as any).normalizeAddress(friendlySourceAddress);

    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'ton-deposit-1',
        source_address: friendlySourceAddress,
        status: 'AWAITING_TRANSFER',
      },
      { deposit_id: 'ton-deposit-2', source_address: 'uqsourcewallet2', status: 'CONFIRMING' },
    ]);

    jest.spyOn(service as any, 'fetchCurrentMasterchainSeqno').mockResolvedValue(120);
    jest.spyOn(service as any, 'fetchRecentUsdtTransfers').mockResolvedValue([
      {
        source: rawSourceAddress,
        destination: '0:516BF3B7B536D324ADB5E0CDCB0578907A5652F45F88A4D7AC232B1B8B407C40',
        amount: '125000000',
        jetton_master: '0:B113A994B5024A16719F69139328EB759596C38A25F59028B146FECDC3621DFE',
        transaction_hash: 'ton-tx-1',
        transaction_lt: '1000',
        transaction_now: 1710000000,
      },
      {
        source: 'UQUNTRACKED',
        destination: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
        amount: '5000000',
        jetton_master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        transaction_hash: 'ton-tx-2',
        transaction_lt: '1001',
        transaction_now: 1710000001,
      },
    ]);
    jest.spyOn(service as any, 'fetchTransactionMcSeqno').mockResolvedValue(114);
    const processTransferSpy = jest.spyOn(service as any, 'processDetectedTransfer').mockResolvedValue(undefined);

    await (service as any).poll();

    expect(processTransferSpy).toHaveBeenCalledTimes(1);
    expect(processTransferSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: 'ton-tx-1',
        fromAddress: rawSourceAddress,
        toAddress: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
        amount: '125',
        confirmations: 6,
        network: 'TON',
        tokenSymbol: 'USDT',
      }),
    );
  });

  it('formats raw TON jetton values using six decimals', () => {
    expect((service as any).formatTokenAmount('125000000')).toBe('125');
    expect((service as any).formatTokenAmount('1234500')).toBe('1.2345');
  });

  it('normalizes friendly and raw TON addresses to the same comparable value', () => {
    expect((service as any).normalizeAddress('UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a')).toBe(
      '0:516bf3b7b536d324adb5e0cdcb0578907a5652f45f88a4d7ac232b1b8b407c40',
    );
    expect((service as any).normalizeAddress('0:516BF3B7B536D324ADB5E0CDCB0578907A5652F45F88A4D7AC232B1B8B407C40')).toBe(
      '0:516bf3b7b536d324adb5e0cdcb0578907a5652f45f88a4d7ac232b1b8b407c40',
    );
  });

  it('matches TON deposits stored as friendly addresses against raw transfer addresses', async () => {
    const friendlySourceAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const rawSourceAddress = (service as any).normalizeAddress(friendlySourceAddress);

    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'ton-deposit-1',
        user_id: 'user-1',
        source_address: friendlySourceAddress,
        status: 'AWAITING_TRANSFER',
      },
    ]);
    mockPrisma.deposit.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 'user-1' });
    mockDepositsService.transition.mockResolvedValue({});
    mockNotificationsService.send.mockResolvedValue({});

    await (service as any).processDetectedTransfer({
      txHash: 'ton-tx-1',
      blockNumber: 123,
      fromAddress: rawSourceAddress,
      toAddress: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
      amount: '10',
      tokenSymbol: 'USDT',
      confirmations: 0,
      timestamp: new Date('2026-04-03T12:00:00.000Z'),
      network: 'TON',
    });

    expect(mockPrisma.deposit.findMany).toHaveBeenCalledWith({
      where: {
        network: 'TON',
        status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
        source_address: { not: null },
      },
    });
    expect(mockDepositsService.transition).toHaveBeenCalledWith('ton-deposit-1', 'DETECTED');
    expect(mockPrisma.deposit.update).toHaveBeenCalledWith({
      where: { deposit_id: 'ton-deposit-1' },
      data: expect.objectContaining({
        tx_hash: 'ton-tx-1',
        source_address: rawSourceAddress,
        confirmed_amount: '10',
        confirmation_count: 0,
      }),
    });
  });

  it('can progress a TON deposit to active in a single successful pass when confirmations are already sufficient', async () => {
    const friendlySourceAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const rawSourceAddress = (service as any).normalizeAddress(friendlySourceAddress);

    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'ton-deposit-2',
        user_id: 'user-2',
        source_address: friendlySourceAddress,
        status: 'AWAITING_TRANSFER',
      },
    ]);
    mockPrisma.deposit.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 'user-2' });
    mockDepositsService.transition.mockResolvedValue({});
    mockNotificationsService.send.mockResolvedValue({});

    await (service as any).processDetectedTransfer({
      txHash: 'ton-tx-2',
      blockNumber: 123,
      fromAddress: rawSourceAddress,
      toAddress: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
      amount: '15',
      tokenSymbol: 'USDT',
      confirmations: 6,
      timestamp: new Date('2026-04-03T12:00:00.000Z'),
      network: 'TON',
    });

    expect(mockDepositsService.transition.mock.calls).toEqual([
      ['ton-deposit-2', 'DETECTED'],
      ['ton-deposit-2', 'CONFIRMING'],
      ['ton-deposit-2', 'CONFIRMED'],
      ['ton-deposit-2', 'ACTIVE'],
    ]);
    expect(mockNotificationsService.send).toHaveBeenCalledTimes(2);
  });

  it('applies one TON transaction to only the newest pending deposit for the same source address', async () => {
    const friendlySourceAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const rawSourceAddress = (service as any).normalizeAddress(friendlySourceAddress);

    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'older-deposit',
        user_id: 'user-1',
        source_address: friendlySourceAddress,
        status: 'AWAITING_TRANSFER',
        created_at: new Date('2026-04-03T10:00:00.000Z'),
        tx_hash: null,
      },
      {
        deposit_id: 'newer-deposit',
        user_id: 'user-1',
        source_address: friendlySourceAddress,
        status: 'AWAITING_TRANSFER',
        created_at: new Date('2026-04-03T11:00:00.000Z'),
        tx_hash: null,
      },
    ]);
    mockPrisma.deposit.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 'user-1' });
    mockDepositsService.transition.mockResolvedValue({});
    mockNotificationsService.send.mockResolvedValue({});

    await (service as any).processDetectedTransfer({
      txHash: 'ton-tx-3',
      blockNumber: 123,
      fromAddress: rawSourceAddress,
      toAddress: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
      amount: '12',
      tokenSymbol: 'USDT',
      confirmations: 0,
      timestamp: new Date('2026-04-03T12:00:00.000Z'),
      network: 'TON',
    });

    expect(mockDepositsService.transition).toHaveBeenCalledTimes(1);
    expect(mockDepositsService.transition).toHaveBeenCalledWith('newer-deposit', 'DETECTED');
    expect(mockPrisma.deposit.update).toHaveBeenCalledWith({
      where: { deposit_id: 'newer-deposit' },
      data: expect.objectContaining({
        tx_hash: 'ton-tx-3',
      }),
    });
  });

  it('limits transfer polling to the relevant deposit creation window', () => {
    const now = new Date('2026-04-03T12:00:00.000Z');
    const earlier = new Date('2026-04-03T11:30:00.000Z');

    expect((service as any).getEarliestCreatedAtUnix([{ created_at: now }, { created_at: earlier }])).toBe(
      Math.floor(earlier.getTime() / 1000) - 60 * 60,
    );
  });
});
