import { Test } from '@nestjs/testing';
import { DepositsService } from './deposits.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DepositsService', () => {
  let service: DepositsService;

  const mockPrisma = {
    deposit: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    investmentPeriod: {
      findUnique: jest.fn(),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'blockchain.bsc.depositAddress') return '0xBscDepositAddress';
      if (key === 'blockchain.tron.depositAddress') return 'TVPaJrwCFLV3jvVomcZL2U8PT59QSpeimZ';
      if (key === 'blockchain.ton.depositAddress') return 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a';
      return null;
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(DepositsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUser', () => {
    it('should return deposits for a user', async () => {
      mockPrisma.deposit.findMany.mockResolvedValue([
        {
          deposit_id: 'deposit-1',
          user_id: 'user-1',
          investment_period_id: 'period-1',
          network: 'TON',
          asset_symbol: 'USDT',
          deposit_route: 'dr_123',
          source_address: 'source',
          tx_hash: null,
          requested_amount: null,
          confirmed_amount: null,
          confirmation_count: 0,
          status: 'AWAITING_TRANSFER',
          status_reason: null,
          route_expires_at: null,
          created_at: new Date('2026-04-03T00:00:00.000Z'),
          detected_at: null,
          confirmed_at: null,
          activated_at: null,
          completed_at: null,
          cancelled_at: null,
        },
      ]);

      const result = await service.findByUser('user-1');
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]?.deposit_address).toBe('UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a');
      expect(mockPrisma.deposit.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw if deposit not found', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('rejects deposits for non-FUNDING periods', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
        status: 'TRADING_ACTIVE',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });

      await expect(
        service.create('user-1', {
          investment_period_id: 'period-1',
          network: 'TON',
          asset_symbol: 'USDT',
          source_address: 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows deposits during FUNDING periods', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
        status: 'FUNDING',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });
      mockPrisma.deposit.findFirst.mockResolvedValue(null);
      mockPrisma.deposit.create.mockResolvedValue({
        deposit_id: 'deposit-1',
        user_id: 'user-1',
        investment_period_id: 'period-1',
        network: 'TON',
        asset_symbol: 'USDT',
        deposit_route: 'dr_123',
        source_address: 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U',
        tx_hash: null,
        requested_amount: null,
        confirmed_amount: null,
        confirmation_count: 0,
        status: 'AWAITING_TRANSFER',
        status_reason: null,
        route_expires_at: new Date('2026-04-04T00:00:00.000Z'),
        created_at: new Date('2026-04-03T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        cancelled_at: null,
      });

      await service.create('user-1', {
        investment_period_id: 'period-1',
        network: 'TON',
        asset_symbol: 'USDT',
        source_address: 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U',
      });

      expect(mockPrisma.deposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'AWAITING_TRANSFER',
          }),
        }),
      );
    });

    it('rejects duplicate pending deposits for the same network and source address', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
        status: 'FUNDING',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });
      mockPrisma.deposit.findFirst.mockResolvedValue({
        deposit_id: 'existing-deposit',
        status: 'AWAITING_TRANSFER',
      });

      await expect(
        service.create('user-1', {
          investment_period_id: 'period-1',
          network: 'TON',
          asset_symbol: 'USDT',
          source_address: 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.deposit.create).not.toHaveBeenCalled();
    });
  });
});
