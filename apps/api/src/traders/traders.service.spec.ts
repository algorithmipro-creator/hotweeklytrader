import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TradersService } from './traders.service';

describe('TradersService', () => {
  let service: TradersService;

  const mockPrisma = {
    trader: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    traderMainAddress: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TradersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(TradersService);
    jest.clearAllMocks();
  });

  it('returns active traders for the miniapp directory', async () => {
    mockPrisma.trader.findMany.mockResolvedValue([
      {
        trader_id: 't1',
        nickname: 'alpha',
        slug: 'alpha',
        display_name: 'Alpha',
        description: 'Alpha profile',
        profile_title: 'semper in motu ai',
        status: 'ACTIVE',
      },
    ]);

    await expect(service.findAllActive()).resolves.toEqual([
      expect.objectContaining({
        trader_id: 't1',
        nickname: 'alpha',
        slug: 'alpha',
      }),
    ]);
  });

  it('resolves an active main address by trader and network', async () => {
    mockPrisma.traderMainAddress.findFirst.mockResolvedValue({
      trader_main_address_id: 'addr-1',
      trader_id: 't1',
      network: 'TON',
      asset_symbol: 'USDT',
      address: 'UQ-trader-wallet',
      is_active: true,
    });

    await expect(service.resolveMainAddress('t1', 'TON', 'USDT')).resolves.toEqual(
      expect.objectContaining({
        trader_main_address_id: 'addr-1',
        address: 'UQ-trader-wallet',
      }),
    );
  });

  it('rejects missing active main address resolution', async () => {
    mockPrisma.traderMainAddress.findFirst.mockResolvedValue(null);

    await expect(service.resolveMainAddress('t1', 'TON', 'USDT')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates a trader with default profile title when not provided', async () => {
    mockPrisma.trader.create.mockResolvedValue({
      trader_id: 't1',
      nickname: 'flux',
      slug: 'flux-trader',
      display_name: 'Flux Trader',
      description: null,
      profile_title: 'semper in motu ai',
      status: 'ACTIVE',
      main_addresses: [],
    });

    const result = await service.create({
      nickname: 'flux',
      slug: 'flux-trader',
      display_name: 'Flux Trader',
    });

    expect(mockPrisma.trader.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          profile_title: 'semper in motu ai',
          status: 'ACTIVE',
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ trader_id: 't1', slug: 'flux-trader' }));
  });

  it('updates a trader after verifying existence', async () => {
    mockPrisma.trader.findUnique.mockResolvedValueOnce({ trader_id: 't1' });
    mockPrisma.trader.update.mockResolvedValue({
      trader_id: 't1',
      nickname: 'flux',
      slug: 'flux-trader',
      display_name: 'Flux Prime',
      description: 'Updated profile',
      profile_title: 'pilot mode',
      status: 'PAUSED',
      main_addresses: [],
    });

    const result = await service.update('t1', {
      display_name: 'Flux Prime',
      description: 'Updated profile',
      profile_title: 'pilot mode',
      status: 'PAUSED',
    });

    expect(mockPrisma.trader.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trader_id: 't1' },
        data: expect.objectContaining({
          display_name: 'Flux Prime',
          status: 'PAUSED',
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ display_name: 'Flux Prime', status: 'PAUSED' }));
  });

  it('rotates active main address and normalizes non-TON addresses', async () => {
    mockPrisma.trader.findUnique.mockResolvedValueOnce({ trader_id: 't1' });
    mockPrisma.traderMainAddress.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.traderMainAddress.create.mockResolvedValue({
      trader_main_address_id: 'addr-2',
      trader_id: 't1',
      network: 'TRON',
      asset_symbol: 'USDT',
      address: 'tnormalizedwallet',
      is_active: true,
    });

    const result = await service.upsertMainAddress('t1', {
      network: 'TRON',
      asset_symbol: 'USDT',
      address: 'TNormalizedWallet',
      is_active: true,
    });

    expect(mockPrisma.traderMainAddress.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          trader_id: 't1',
          network: 'TRON',
          asset_symbol: 'USDT',
          is_active: true,
        }),
        data: { is_active: false },
      }),
    );
    expect(mockPrisma.traderMainAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          address: 'tnormalizedwallet',
        }),
      }),
    );
    expect(result).toEqual(expect.objectContaining({ address: 'tnormalizedwallet' }));
  });
});
