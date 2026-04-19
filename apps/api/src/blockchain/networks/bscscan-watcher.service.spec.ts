import { BscScanWatcherService } from './bscscan-watcher.service';

describe('BscScanWatcherService', () => {
  const mockPrisma = {
    deposit: {
      findMany: jest.fn(),
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

  let service: BscScanWatcherService;

  beforeEach(() => {
    service = new BscScanWatcherService(
      mockPrisma as any,
      mockDepositsService as any,
      mockNotificationsService as any,
    );

    (service as any).depositAddress = '0x1fFFbcda5bB208CbAd95882a9e57FA9354533AaC';
    (service as any).lastProcessedBlock = 95;

    jest.clearAllMocks();
  });

  it('scans transfers once per poll and only processes tracked source addresses', async () => {
    mockPrisma.deposit.findMany.mockResolvedValue([
      { deposit_id: 'dep-1', source_address: '0xabc', status: 'AWAITING_TRANSFER' },
      { deposit_id: 'dep-2', source_address: '0xdef', status: 'AWAITING_TRANSFER' },
    ]);

    jest.spyOn(service as any, 'getLatestBlock').mockResolvedValue(100);
    const getTokenTransfersSpy = jest.spyOn(service as any, 'getTokenTransfers').mockResolvedValue([
      { hash: 'tx-1', blockNumber: '99', from: '0xabc', to: '0x1fFFbcda5bB208CbAd95882a9e57FA9354533AaC', value: '0xde0b6b3a7640000', timeStamp: '0' },
      { hash: 'tx-2', blockNumber: '100', from: '0x999', to: '0x1fFFbcda5bB208CbAd95882a9e57FA9354533AaC', value: '0x1', timeStamp: '0' },
    ]);
    const processTransferSpy = jest.spyOn(service as any, 'processDetectedTransfer').mockResolvedValue(undefined);

    await (service as any).poll();

    expect(getTokenTransfersSpy).toHaveBeenCalledTimes(1);
    expect(getTokenTransfersSpy).toHaveBeenCalledWith(96, 100, '0x1fFFbcda5bB208CbAd95882a9e57FA9354533AaC');
    expect(processTransferSpy).toHaveBeenCalledTimes(1);
    expect(processTransferSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        txHash: 'tx-1',
        fromAddress: '0xabc',
        amount: '1',
      }),
    );
    expect((service as any).lastProcessedBlock).toBe(100);
  });

  it('formats hex token amounts without losing precision', () => {
    expect((service as any).formatTokenAmount('0xde0b6b3a7640000', 18n)).toBe('1');
    expect((service as any).formatTokenAmount('0x16345785d8a0000', 18n)).toBe('0.1');
  });
});
