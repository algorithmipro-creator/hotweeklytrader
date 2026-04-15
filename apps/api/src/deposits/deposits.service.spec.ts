import { Test } from '@nestjs/testing';
import { Address } from '@ton/core';
import { DepositsService } from './deposits.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TradersService } from '../traders/traders.service';
import { WalletsService } from '../wallets/wallets.service';

describe('DepositsService', () => {
  let service: DepositsService;

  const mockPrisma = {
    deposit: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
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
      if (key === 'blockchain.ton.depositAddress') return 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a';
      if (key === 'blockchain.tron.depositAddress') return 'TVPaJrwCFLV3jvVomcZL2U8PT59QSpeimZ';
      if (key === 'blockchain.bsc.depositAddress') return '0x1fFFbcda5bB208CbAd95882a9e57FA9354533AaC';
      return '';
    }),
  };

  const mockTradersService = {
    resolveMainAddress: jest.fn(),
  };

  const mockWalletsService = {
    findOrCreate: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DepositsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: TradersService, useValue: mockTradersService },
        { provide: WalletsService, useValue: mockWalletsService },
      ],
    }).compile();

    service = (module as any).get(DepositsService);
    jest.clearAllMocks();
    mockTradersService.resolveMainAddress.mockReset();
    mockWalletsService.findOrCreate.mockReset();
    mockPrisma.deposit.count.mockReset();
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
          source_address: 'uqsource',
          tx_hash: null,
          requested_amount: null,
          confirmed_amount: null,
          confirmation_count: 0,
          status: 'AWAITING_TRANSFER',
          status_reason: null,
          settlement_preference: 'REINVEST_PRINCIPAL',
          auto_renew_trader_id_snapshot: 'trader-1',
          auto_renew_network_snapshot: 'TON',
          auto_renew_asset_symbol_snapshot: 'USDT',
          rolled_over_into_deposit_id: 'deposit-2',
          rollover_source_deposit_id: 'deposit-1',
          rollover_attempted_at: new Date('2026-04-04T12:00:00.000Z'),
          rollover_block_reason: null,
          route_expires_at: new Date('2026-04-04T00:00:00.000Z'),
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
      expect(result[0]?.settlement_preference).toBe('REINVEST_PRINCIPAL');
      expect(result[0]?.auto_renew_trader_id_snapshot).toBe('trader-1');
      expect(result[0]?.auto_renew_network_snapshot).toBe('TON');
      expect(result[0]?.auto_renew_asset_symbol_snapshot).toBe('USDT');
      expect(result[0]?.rolled_over_into_deposit_id).toBe('deposit-2');
      expect(result[0]?.rollover_source_deposit_id).toBe('deposit-1');
      expect(result[0]?.rollover_attempted_at).toBe('2026-04-04T12:00:00.000Z');
      expect(result[0]?.rollover_block_reason).toBeNull();
      expect(mockPrisma.deposit.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        include: { trader_main_address: true },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw if deposit not found', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('serializes settlement preference and rollover metadata', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue({
        deposit_id: 'deposit-1',
        user_id: 'user-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        trader_main_address_id: 'main-1',
        network: 'TON',
        asset_symbol: 'USDT',
        deposit_route: 'dr_123',
        source_address: 'uqsource',
        return_address: null,
        ton_deposit_memo: null,
        return_memo: null,
        settlement_preference: 'REINVEST_PRINCIPAL',
        auto_renew_trader_id_snapshot: 'trader-1',
        auto_renew_network_snapshot: 'TON',
        auto_renew_asset_symbol_snapshot: 'USDT',
        rolled_over_into_deposit_id: 'deposit-2',
        rollover_source_deposit_id: 'deposit-1',
        rollover_attempted_at: new Date('2026-04-04T12:00:00.000Z'),
        rollover_block_reason: 'blocked',
        tx_hash: null,
        requested_amount: null,
        confirmed_amount: null,
        confirmation_count: 0,
        status: 'ACTIVE',
        status_reason: null,
        route_expires_at: new Date('2026-04-04T00:00:00.000Z'),
        created_at: new Date('2026-04-03T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        cancelled_at: null,
        trader_main_address: { address: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a' },
      });

      const result = await service.findOne('deposit-1', 'user-1');

      expect(result.settlement_preference).toBe('REINVEST_PRINCIPAL');
      expect(result.auto_renew_trader_id_snapshot).toBe('trader-1');
      expect(result.auto_renew_network_snapshot).toBe('TON');
      expect(result.auto_renew_asset_symbol_snapshot).toBe('USDT');
      expect(result.rolled_over_into_deposit_id).toBe('deposit-2');
      expect(result.rollover_source_deposit_id).toBe('deposit-1');
      expect(result.rollover_attempted_at).toBe('2026-04-04T12:00:00.000Z');
      expect(result.rollover_block_reason).toBe('blocked');
    });
  });

  describe('create', () => {
    it('normalizes TON source address into raw format', async () => {
      const tonFriendlyAddress = 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U';
      const tonRawAddress = Address.parse(tonFriendlyAddress).toRawString().toLowerCase();
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
        status: 'ACTIVE',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });
      mockTradersService.resolveMainAddress.mockResolvedValue({
        trader_main_address_id: 'main-1',
        address: 'UQ-trader-wallet',
      });
      mockWalletsService.findOrCreate.mockResolvedValue({
        wallet_id: 'wallet-1',
        source_address: tonRawAddress,
      });
      mockPrisma.deposit.count.mockResolvedValue(0);
      mockPrisma.deposit.create.mockImplementation(async ({ data }: any) => ({
        deposit_id: 'deposit-1',
        user_id: data.user_id,
        investment_period_id: data.investment_period_id,
        network: data.network,
        asset_symbol: data.asset_symbol,
        deposit_route: data.deposit_route,
        source_address: data.source_address,
        tx_hash: null,
        requested_amount: null,
        confirmed_amount: null,
        confirmation_count: 0,
        status: data.status,
        status_reason: null,
        settlement_preference: data.settlement_preference,
        auto_renew_trader_id_snapshot: data.auto_renew_trader_id_snapshot ?? null,
        auto_renew_network_snapshot: data.auto_renew_network_snapshot ?? null,
        auto_renew_asset_symbol_snapshot: data.auto_renew_asset_symbol_snapshot ?? null,
        rolled_over_into_deposit_id: data.rolled_over_into_deposit_id ?? null,
        rollover_source_deposit_id: data.rollover_source_deposit_id ?? null,
        rollover_attempted_at: data.rollover_attempted_at ?? null,
        rollover_block_reason: data.rollover_block_reason ?? null,
        route_expires_at: data.route_expires_at,
        created_at: new Date('2026-04-03T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        cancelled_at: null,
      }));

      await service.create('user-1', {
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        network: 'TON',
        asset_symbol: 'USDT',
        source_address: tonFriendlyAddress,
        settlement_preference: 'REINVEST_PRINCIPAL',
      } as any);

      expect(mockPrisma.deposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source_address: tonRawAddress,
            settlement_preference: 'REINVEST_PRINCIPAL',
          }),
        }),
      );
    });

    it('stores return routing fields for TON deposits', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
        status: 'ACTIVE',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });
      mockTradersService.resolveMainAddress.mockResolvedValue({
        trader_main_address_id: 'trader-main-1',
        address: 'UQ-trader-wallet',
      });
      mockPrisma.deposit.count.mockResolvedValue(0);
      mockWalletsService.findOrCreate.mockResolvedValue({
        wallet_id: 'wallet-1',
        source_address: '0:source',
        network: 'TON',
        wallet_role: 'RETURNING',
      });
      mockPrisma.deposit.create.mockImplementation(async ({ data }: any) => ({
        deposit_id: 'deposit-1',
        user_id: data.user_id,
        investment_period_id: data.investment_period_id,
        trader_id: data.trader_id,
        trader_main_address_id: data.trader_main_address_id,
        network: data.network,
        asset_symbol: data.asset_symbol,
        deposit_route: data.deposit_route,
        source_address: data.source_address,
        return_address: data.return_address,
        ton_deposit_memo: data.ton_deposit_memo,
        return_memo: data.return_memo,
        requested_amount: null,
        confirmed_amount: null,
        confirmation_count: 0,
        status: data.status,
        status_reason: null,
        route_expires_at: data.route_expires_at,
        tx_hash: null,
        created_at: new Date('2026-04-10T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        cancelled_at: null,
        trader_main_address: { address: 'UQ-trader-wallet' },
      }));

      const result = await service.create('user-1', {
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        network: 'TON',
        asset_symbol: 'USDT',
        source_address: 'UQ-source-wallet',
        return_address: '0:return',
        ton_deposit_memo: 'MEMO123',
        return_memo: 'RETURN456',
      });

      expect(mockPrisma.deposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            return_address: '0:return',
            ton_deposit_memo: 'TWUSER1',
            return_memo: 'RETURN456',
            settlement_preference: 'WITHDRAW_ALL',
          }),
        }),
      );
      expect(result.return_address).toBe('0:return');
      expect(result.ton_deposit_memo).toBe('TWUSER1');
      expect(result.return_memo).toBe('RETURN456');
      expect(result.settlement_preference).toBe('WITHDRAW_ALL');
      expect(result.rollover_source_deposit_id).toBeNull();
    });

    it('blocks creating more than 10 deposits for the same period', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
        status: 'ACTIVE',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });
      mockTradersService.resolveMainAddress.mockResolvedValue({
        trader_main_address_id: 'main-1',
        address: 'UQ-trader-wallet',
      });
      mockPrisma.deposit.count.mockResolvedValue(10);

      await expect(
        service.create('user-1', {
          investment_period_id: 'period-1',
          trader_id: 'trader-1',
          network: 'TON',
          asset_symbol: 'USDT',
          source_address: 'UQBURPCkGRJDaQiYF_e9v1WGCEKx7lbcxg_-hNaa_tn5Aw2U',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.deposit.create).not.toHaveBeenCalled();
    });

    it('allows multiple deposits with the same address while below the period limit', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
        status: 'ACTIVE',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });
      mockTradersService.resolveMainAddress.mockResolvedValue({
        trader_main_address_id: 'main-1',
        trader_id: 'trader-1',
        network: 'TON',
        asset_symbol: 'USDT',
        address: 'UQ-trader-wallet',
      });
      mockWalletsService.findOrCreate.mockResolvedValue({
        wallet_id: 'wallet-1',
        source_address: 'user-wallet',
      });
      mockPrisma.deposit.count.mockResolvedValue(2);
      mockPrisma.deposit.create.mockImplementation(async ({ data }: any) => ({
        deposit_id: 'deposit-1',
        user_id: data.user_id,
        investment_period_id: data.investment_period_id,
        trader_id: data.trader_id,
        trader_main_address_id: data.trader_main_address_id,
        network: data.network,
        asset_symbol: data.asset_symbol,
        deposit_route: data.deposit_route,
        source_address: data.source_address,
        return_address: data.return_address ?? null,
        ton_deposit_memo: data.ton_deposit_memo ?? null,
        return_memo: data.return_memo ?? null,
        tx_hash: null,
        requested_amount: null,
        confirmed_amount: null,
        confirmation_count: 0,
        status: data.status,
        status_reason: null,
        route_expires_at: data.route_expires_at,
        created_at: new Date('2026-04-03T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        cancelled_at: null,
      }));

      await service.create('user-1', {
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        network: 'TON',
        asset_symbol: 'USDT',
        source_address: 'user-wallet',
      } as any);

      expect(mockPrisma.deposit.count).toHaveBeenCalledWith({
        where: {
          user_id: 'user-1',
          investment_period_id: 'period-1',
        },
      });
      expect(mockPrisma.deposit.create).toHaveBeenCalled();
    });

    it('creates a deposit linked to period, trader, and trader main address', async () => {
      mockPrisma.investmentPeriod.findUnique.mockResolvedValue({
        investment_period_id: 'period-1',
        status: 'ACTIVE',
        accepted_networks: ['TON'],
        accepted_assets: ['USDT'],
      });
      mockTradersService.resolveMainAddress.mockResolvedValue({
        trader_main_address_id: 'main-1',
        trader_id: 'trader-1',
        network: 'TON',
        asset_symbol: 'USDT',
        address: 'UQ-trader-wallet',
      });
      mockWalletsService.findOrCreate.mockResolvedValue({
        wallet_id: 'wallet-1',
        source_address: 'user-wallet',
      });
      mockPrisma.deposit.count.mockResolvedValue(0);
      mockPrisma.deposit.create.mockImplementation(async ({ data }: any) => ({
        deposit_id: 'deposit-1',
        user_id: data.user_id,
        investment_period_id: data.investment_period_id,
        trader_id: data.trader_id,
        trader_main_address_id: data.trader_main_address_id,
        network: data.network,
        asset_symbol: data.asset_symbol,
        deposit_route: data.deposit_route,
        source_address: data.source_address,
        tx_hash: null,
        requested_amount: null,
        confirmed_amount: null,
        confirmation_count: 0,
        status: data.status,
        status_reason: null,
        route_expires_at: data.route_expires_at,
        created_at: new Date('2026-04-03T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        cancelled_at: null,
      }));

      await service.create('user-1', {
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        network: 'TON',
        asset_symbol: 'USDT',
        source_address: 'user-wallet',
      } as any);

      expect(mockTradersService.resolveMainAddress).toHaveBeenCalledWith(
        'trader-1',
        'TON',
        'USDT',
      );
      expect(mockPrisma.deposit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trader_id: 'trader-1',
            trader_main_address_id: 'main-1',
          }),
        }),
      );
    });
  });

  describe('cancelByUser', () => {
    it('allows the owner to cancel an awaiting-transfer deposit', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue({
        deposit_id: 'dep-1',
        user_id: 'user-1',
        status: 'AWAITING_TRANSFER',
        trader_main_address: { address: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a' },
      });
      mockPrisma.deposit.update.mockResolvedValue({
        deposit_id: 'dep-1',
        user_id: 'user-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        trader_main_address_id: 'main-1',
        network: 'TON',
        asset_symbol: 'USDT',
        deposit_route: 'dr_123',
        source_address: 'uqsource',
        return_address: null,
        ton_deposit_memo: null,
        return_memo: null,
        settlement_preference: 'WITHDRAW_ALL',
        auto_renew_trader_id_snapshot: null,
        auto_renew_network_snapshot: null,
        auto_renew_asset_symbol_snapshot: null,
        rolled_over_into_deposit_id: null,
        rollover_source_deposit_id: null,
        rollover_attempted_at: null,
        rollover_block_reason: null,
        tx_hash: null,
        requested_amount: null,
        confirmed_amount: null,
        confirmation_count: 0,
        status: 'CANCELLED',
        status_reason: 'Cancelled by user before transfer',
        route_expires_at: new Date('2026-04-04T00:00:00.000Z'),
        created_at: new Date('2026-04-03T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        cancelled_at: new Date('2026-04-15T18:00:00.000Z'),
        trader_main_address: { address: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a' },
      });

      const result = await service.cancelByUser('dep-1', 'user-1');

      expect(mockPrisma.deposit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deposit_id: 'dep-1' },
          data: expect.objectContaining({
            status: 'CANCELLED',
            status_reason: 'Cancelled by user before transfer',
            cancelled_at: expect.any(Date),
          }),
          include: { trader_main_address: true },
        }),
      );
      expect(result.status).toBe('CANCELLED');
    });

    it('rejects user cancellation for deposits not owned by the user', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue({
        deposit_id: 'dep-1',
        user_id: 'someone-else',
        status: 'AWAITING_TRANSFER',
      });

      await expect(service.cancelByUser('dep-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('rejects user cancellation once the deposit is no longer awaiting transfer', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue({
        deposit_id: 'dep-1',
        user_id: 'user-1',
        status: 'DETECTED',
      });

      await expect(service.cancelByUser('dep-1', 'user-1')).rejects.toThrow(
        new BadRequestException('Only awaiting-transfer deposits can be cancelled by the user'),
      );
    });
  });

  describe('updateSettlementPreference', () => {
    it('updates the settlement preference before the cycle is settled', async () => {
      mockPrisma.deposit.findUnique.mockResolvedValue({
        deposit_id: 'deposit-1',
        user_id: 'user-1',
        status: 'ACTIVE',
      });
      mockPrisma.deposit.update.mockResolvedValue({
        deposit_id: 'deposit-1',
        user_id: 'user-1',
        investment_period_id: 'period-1',
        trader_id: 'trader-1',
        trader_main_address_id: 'main-1',
        network: 'TON',
        asset_symbol: 'USDT',
        deposit_route: 'dr_123',
        source_address: 'uqsource',
        return_address: null,
        ton_deposit_memo: null,
        return_memo: null,
        settlement_preference: 'REINVEST_ALL',
        auto_renew_trader_id_snapshot: null,
        auto_renew_network_snapshot: null,
        auto_renew_asset_symbol_snapshot: null,
        rolled_over_into_deposit_id: null,
        rollover_source_deposit_id: null,
        rollover_attempted_at: null,
        rollover_block_reason: null,
        tx_hash: null,
        requested_amount: null,
        confirmed_amount: null,
        confirmation_count: 0,
        status: 'ACTIVE',
        status_reason: null,
        route_expires_at: new Date('2026-04-04T00:00:00.000Z'),
        created_at: new Date('2026-04-03T00:00:00.000Z'),
        detected_at: null,
        confirmed_at: null,
        activated_at: null,
        completed_at: null,
        cancelled_at: null,
        trader_main_address: { address: 'UQBRa_O3tTbTJK214M3LBXiQelZS9F-IpNesIysbi0B8QB8a' },
      });

      const result = await service.updateSettlementPreference('deposit-1', 'user-1', 'reinvest_all');

      expect(mockPrisma.deposit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deposit_id: 'deposit-1' },
          data: { settlement_preference: 'REINVEST_ALL' },
          include: { trader_main_address: true },
        }),
      );
      expect(result.settlement_preference).toBe('REINVEST_ALL');
    });

    it.each(['REPORT_READY', 'PAYOUT_PENDING', 'PAYOUT_APPROVED', 'PAYOUT_SENT', 'PAYOUT_CONFIRMED'])(
      'blocks updates once the deposit is in %s',
      async (status) => {
        mockPrisma.deposit.findUnique.mockResolvedValue({
          deposit_id: 'deposit-1',
          user_id: 'user-1',
          status,
        });

        await expect(
          service.updateSettlementPreference('deposit-1', 'user-1', 'WITHDRAW_ALL'),
        ).rejects.toThrow(BadRequestException);

        expect(mockPrisma.deposit.update).not.toHaveBeenCalled();
      },
    );
  });
});
