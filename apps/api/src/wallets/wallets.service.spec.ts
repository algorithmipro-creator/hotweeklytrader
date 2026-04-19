import { Test } from '@nestjs/testing';
import { Address } from '@ton/core';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WalletsService', () => {
  let service: WalletsService;

  const mockPrisma = {
    wallet: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    deposit: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(WalletsService);
    jest.clearAllMocks();
  });

  it('stores TON wallets in raw form but returns them in friendly form', async () => {
    const tonFriendlyAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
    const tonRawAddress = Address.parse(tonFriendlyAddress).toRawString().toLowerCase();
    mockPrisma.wallet.findFirst.mockResolvedValue(null);
    mockPrisma.wallet.create.mockResolvedValue({
      wallet_id: 'wallet-1',
      user_id: 'user-1',
      network: 'TON',
      source_address: tonRawAddress,
      payout_address: null,
      verification_status: 'unverified',
      first_seen_at: new Date('2026-04-03T00:00:00.000Z'),
      last_used_at: null,
      created_at: new Date('2026-04-03T00:00:00.000Z'),
      updated_at: new Date('2026-04-03T00:00:00.000Z'),
    });

    const result = await service.bind('user-1', {
      network: 'TON',
      source_address: tonFriendlyAddress,
    });

    expect(mockPrisma.wallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source_address: tonRawAddress,
        }),
      }),
    );
    expect(result.source_address).toBe(Address.parse(tonRawAddress).toString());
  });

  it('creates a wallet record when deposit source address is new', async () => {
    mockPrisma.wallet.findFirst.mockResolvedValue(null);
    mockPrisma.wallet.create.mockResolvedValue({
      wallet_id: 'w1',
      user_id: 'user-1',
      network: 'TON',
      source_address: 'user-wallet',
      payout_address: null,
      verification_status: 'unverified',
      first_seen_at: new Date('2026-04-03T00:00:00.000Z'),
      last_used_at: null,
      created_at: new Date('2026-04-03T00:00:00.000Z'),
      updated_at: new Date('2026-04-03T00:00:00.000Z'),
    });

    await service.findOrCreate('user-1', 'TON', 'user-wallet');

    expect(mockPrisma.wallet.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: 'user-1',
          network: 'TON',
          source_address: 'user-wallet',
        }),
      }),
    );
  });

  it('can mark an existing wallet as returning without duplicating the address', async () => {
    mockPrisma.wallet.findFirst.mockResolvedValue({
      wallet_id: 'wallet-1',
      user_id: 'user-1',
      network: 'TON',
      source_address: '0:return',
      payout_address: null,
      verification_status: 'unverified',
      wallet_role: 'SOURCE',
      first_seen_at: new Date('2026-04-10T00:00:00.000Z'),
      last_used_at: null,
      created_at: new Date('2026-04-10T00:00:00.000Z'),
      updated_at: new Date('2026-04-10T00:00:00.000Z'),
    });
    mockPrisma.wallet.update.mockResolvedValue({
      wallet_id: 'wallet-1',
      user_id: 'user-1',
      network: 'TON',
      source_address: '0:return',
      payout_address: null,
      verification_status: 'unverified',
      wallet_role: 'BOTH',
      first_seen_at: new Date('2026-04-10T00:00:00.000Z'),
      last_used_at: null,
      created_at: new Date('2026-04-10T00:00:00.000Z'),
      updated_at: new Date('2026-04-10T00:00:00.000Z'),
    });

    const result = await service.findOrCreate('user-1', 'TON', '0:return', 'RETURNING');

    expect(mockPrisma.wallet.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { wallet_id: 'wallet-1' },
        data: expect.objectContaining({ wallet_role: 'BOTH' }),
      }),
    );
    expect(result.wallet_role).toBe('BOTH');
  });
});
