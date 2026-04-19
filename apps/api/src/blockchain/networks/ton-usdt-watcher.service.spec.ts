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
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    transactionLog: {
      findFirst: jest.fn(),
      create: jest.fn(),
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
        OR: [{ source_address: { not: null } }, { ton_deposit_memo: { not: null } }],
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


  it('matches a TON deposit by memo even when source address is deferred until after creation', async () => {
    const exchangeSourceAddress = 'UQAbcEXCHANGEsharedWallet11111111111111111111111';

    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'deferred-memo-deposit',
        user_id: 'user-1',
        source_address: null,
        ton_deposit_memo: 'TWDEFERRED52FABE44A66ADA847B02AB8F065',
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
      txHash: 'deferred-memo-ton-tx-1',
      blockNumber: 123,
      fromAddress: exchangeSourceAddress,
      toAddress: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
      amount: '25',
      tokenSymbol: 'USDT',
      confirmations: 0,
      timestamp: new Date('2026-04-03T12:00:00.000Z'),
      network: 'TON',
      memo: 'TWDEFERRED52FABE44A66ADA847B02AB8F065',
    });

    expect(mockPrisma.deposit.findMany).toHaveBeenCalledWith({
      where: {
        network: 'TON',
        status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
        OR: [{ source_address: { not: null } }, { ton_deposit_memo: { not: null } }],
      },
    });
    expect(mockDepositsService.transition).toHaveBeenCalledWith('deferred-memo-deposit', 'DETECTED');
  });

  it('matches a TON deposit by memo even when the exchange source address is shared and untracked', async () => {
    const userSourceAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const exchangeSourceAddress = 'UQAbcEXCHANGEsharedWallet11111111111111111111111';

    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'memo-deposit',
        user_id: 'user-3',
        source_address: userSourceAddress,
        ton_deposit_memo: 'TW6726D52FABE44A66ADA847B02AB8F065',
        status: 'AWAITING_TRANSFER',
        created_at: new Date('2026-04-15T09:42:53.145Z'),
        tx_hash: null,
      },
    ]);
    mockPrisma.deposit.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 'user-3' });
    mockDepositsService.transition.mockResolvedValue({});
    mockNotificationsService.send.mockResolvedValue({});

    jest.spyOn(service as any, 'fetchCurrentMasterchainSeqno').mockResolvedValue(120);
    jest.spyOn(service as any, 'fetchRecentUsdtTransfers').mockResolvedValue([
      {
        source: exchangeSourceAddress,
        destination: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
        amount: '9960000',
        jetton_master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        transaction_hash: 'memo-ton-tx-1',
        transaction_lt: '2000',
        transaction_now: 1776240000,
        memo: 'TW6726D52FABE44A66ADA847B02AB8F065',
      },
    ]);
    jest.spyOn(service as any, 'fetchTransactionMcSeqno').mockResolvedValue(114);

    await (service as any).poll();

    expect(mockDepositsService.transition).toHaveBeenCalledWith('memo-deposit', 'DETECTED');
    expect(mockPrisma.deposit.update).toHaveBeenCalledWith({
      where: { deposit_id: 'memo-deposit' },
      data: expect.objectContaining({
        tx_hash: 'memo-ton-tx-1',
        confirmed_amount: '9.96',
      }),
    });
  });

  it('matches a TON deposit when jetton transfers omit memo but transaction detail contains it', async () => {
    const userSourceAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const exchangeSourceAddress = 'UQAbcEXCHANGEsharedWallet22222222222222222222222';

    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'memo-detail-deposit',
        user_id: 'user-4',
        source_address: userSourceAddress,
        ton_deposit_memo: 'TW382DA315C98343E3841391AD3D63EB89',
        status: 'AWAITING_TRANSFER',
        created_at: new Date('2026-04-15T14:16:47.051Z'),
        tx_hash: null,
      },
    ]);
    mockPrisma.deposit.update.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 'user-4' });
    mockDepositsService.transition.mockResolvedValue({});
    mockNotificationsService.send.mockResolvedValue({});

    jest.spyOn(service as any, 'fetchCurrentMasterchainSeqno').mockResolvedValue(120);
    jest.spyOn(service as any, 'fetchRecentUsdtTransfers').mockResolvedValue([
      {
        source: exchangeSourceAddress,
        destination: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
        amount: '9968000',
        jetton_master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        transaction_hash: 'memo-ton-tx-2',
        transaction_lt: '3000',
        transaction_now: 1776263013,
      },
    ]);
    (service as any).fetchTransactionMemo = jest.fn().mockResolvedValue('TW382DA315C98343E3841391AD3D63EB89');
    jest.spyOn(service as any, 'fetchTransactionMcSeqno').mockResolvedValue(114);

    await (service as any).poll();

    expect((service as any).fetchTransactionMemo).toHaveBeenCalledWith('memo-ton-tx-2');
    expect(mockDepositsService.transition).toHaveBeenCalledWith('memo-detail-deposit', 'DETECTED');
    expect(mockPrisma.deposit.update).toHaveBeenCalledWith({
      where: { deposit_id: 'memo-detail-deposit' },
      data: expect.objectContaining({
        tx_hash: 'memo-ton-tx-2',
        confirmed_amount: '9.968',
      }),
    });
  });

  it('records a TON transaction log when a memo-routed transfer is detected', async () => {
    const userSourceAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const exchangeSourceAddress = 'UQAbcEXCHANGEsharedWallet33333333333333333333333';

    mockPrisma.deposit.findMany.mockResolvedValue([
      {
        deposit_id: 'memo-log-deposit',
        user_id: 'user-5',
        source_address: userSourceAddress,
        ton_deposit_memo: 'TWLOGA315C98343E3841391AD3D63EB89',
        status: 'AWAITING_TRANSFER',
        created_at: new Date('2026-04-15T14:16:47.051Z'),
        tx_hash: null,
      },
    ]);
    mockPrisma.deposit.update.mockResolvedValue({});
    mockPrisma.transactionLog.findFirst.mockResolvedValue(null);
    mockPrisma.transactionLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 'user-5' });
    mockDepositsService.transition.mockResolvedValue({});
    mockNotificationsService.send.mockResolvedValue({});

    jest.spyOn(service as any, 'fetchCurrentMasterchainSeqno').mockResolvedValue(120);
    jest.spyOn(service as any, 'fetchRecentUsdtTransfers').mockResolvedValue([
      {
        source: exchangeSourceAddress,
        destination: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
        amount: '9968000',
        jetton_master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        transaction_hash: 'memo-ton-log-tx',
        transaction_lt: '4000',
        transaction_now: 1776263013,
      },
    ]);
    (service as any).fetchTransactionMemo = jest.fn().mockResolvedValue('TWLOGA315C98343E3841391AD3D63EB89');
    jest.spyOn(service as any, 'fetchTransactionMcSeqno').mockResolvedValue(114);

    await (service as any).poll();

    expect(mockPrisma.transactionLog.findFirst).toHaveBeenCalledWith({
      where: { tx_hash: 'memo-ton-log-tx', network: 'TON' },
    });
    expect(mockPrisma.transactionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direction: 'inbound',
        network: 'TON',
        asset_symbol: 'USDT',
        tx_hash: 'memo-ton-log-tx',
        amount: '9.968',
        status: 'confirmed',
        source_system: 'blockchain-watcher',
      }),
    });
  });

  it('does not activate a second TON deposit when the tx hash is already bound to another deposit', async () => {
    const userSourceAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const exchangeSourceAddress = 'UQAbcEXCHANGEsharedWallet44444444444444444444444';

    mockPrisma.deposit.findMany
      .mockResolvedValueOnce([
        {
          deposit_id: 'duplicate-target-deposit',
          user_id: 'user-6',
          source_address: userSourceAddress,
          ton_deposit_memo: 'TWDUPLICATEHASH00047B7952484BC363E',
          status: 'AWAITING_TRANSFER',
          created_at: new Date('2026-04-15T14:16:47.051Z'),
          tx_hash: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          deposit_id: 'duplicate-target-deposit',
          user_id: 'user-6',
          source_address: userSourceAddress,
          ton_deposit_memo: 'TWDUPLICATEHASH00047B7952484BC363E',
          status: 'AWAITING_TRANSFER',
          created_at: new Date('2026-04-15T14:16:47.051Z'),
          tx_hash: null,
        },
      ]);
    mockPrisma.deposit.findFirst.mockResolvedValue({
      deposit_id: 'already-bound-deposit',
      tx_hash: 'duplicate-ton-tx',
    });
    mockPrisma.deposit.update.mockResolvedValue({});
    mockPrisma.transactionLog.findFirst.mockResolvedValue(null);
    mockPrisma.transactionLog.create.mockResolvedValue({});
    mockPrisma.user.findUnique.mockResolvedValue({ user_id: 'user-6' });
    mockDepositsService.transition.mockResolvedValue({});
    mockNotificationsService.send.mockResolvedValue({});

    jest.spyOn(service as any, 'fetchCurrentMasterchainSeqno').mockResolvedValue(120);
    jest.spyOn(service as any, 'fetchRecentUsdtTransfers').mockResolvedValue([
      {
        source: exchangeSourceAddress,
        destination: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a',
        amount: '6000000',
        jetton_master: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs',
        transaction_hash: 'duplicate-ton-tx',
        transaction_lt: '5000',
        transaction_now: 1776263013,
      },
    ]);
    (service as any).fetchTransactionMemo = jest.fn().mockResolvedValue('TWDUPLICATEHASH00047B7952484BC363E');
    jest.spyOn(service as any, 'fetchTransactionMcSeqno').mockResolvedValue(114);

    await (service as any).poll();

    expect(mockPrisma.deposit.findFirst).toHaveBeenCalledWith({
      where: {
        tx_hash: 'duplicate-ton-tx',
        deposit_id: { not: 'duplicate-target-deposit' },
      },
    });
    expect(mockDepositsService.transition).not.toHaveBeenCalledWith('duplicate-target-deposit', 'DETECTED');
    expect(mockPrisma.deposit.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { deposit_id: 'duplicate-target-deposit' } }),
    );
  });

  it('limits transfer polling to the relevant deposit creation window', () => {
    const now = new Date('2026-04-03T12:00:00.000Z');
    const earlier = new Date('2026-04-03T11:30:00.000Z');

    expect((service as any).getEarliestCreatedAtUnix([{ created_at: now }, { created_at: earlier }])).toBe(
      Math.floor(earlier.getTime() / 1000) - 60 * 60,
    );
  });
});
