import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address } from '@ton/core';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto, DepositDto, DepositStatus, UpdateDepositReturnRoutingDto } from './dto/deposit.dto';
import { DepositStateMachine } from './deposit-state-machine';
import { randomUUID } from 'crypto';
import { TradersService } from '../traders/traders.service';
import { WalletsService } from '../wallets/wallets.service';
import { buildUserTonDepositMemo } from '../common/ton-memo.util';
import {
  DEFAULT_SETTLEMENT_PREFERENCE,
  normalizeSettlementPreference,
} from '../common/settlement-preference.util';

const MAX_DEPOSITS_PER_USER_PER_PERIOD = 10;

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private tradersService: TradersService,
    private walletsService: WalletsService,
  ) {}

  async findByUser(userId: string): Promise<DepositDto[]> {
    const deposits = await this.prisma.deposit.findMany({
      where: { user_id: userId },
      include: {
        trader_main_address: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return deposits.map((deposit) => this.serialize(deposit));
  }

  async findOne(depositId: string, userId: string): Promise<DepositDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
      include: {
        trader_main_address: true,
      },
    });

    if (!deposit || deposit.user_id !== userId) {
      throw new NotFoundException('Deposit not found');
    }

    return this.serialize(deposit);
  }

  async create(userId: string, dto: CreateDepositDto): Promise<DepositDto> {
    const period = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: dto.investment_period_id },
    });

    if (!period) {
      throw new NotFoundException('Investment period not found');
    }

    if (period.status !== 'ACTIVE' && period.status !== 'DRAFT') {
      throw new BadRequestException('Investment period is not accepting deposits');
    }

    if (!period.accepted_networks.includes(dto.network)) {
      throw new BadRequestException(`Network ${dto.network} is not supported for this period`);
    }

    if (!period.accepted_assets.includes(dto.asset_symbol)) {
      throw new BadRequestException(`Asset ${dto.asset_symbol} is not supported for this network`);
    }

    const isDeferredTonExchangeRouting = dto.network === 'TON' && dto.sending_from_exchange === true;
    const normalizedSourceAddress = isDeferredTonExchangeRouting
      ? null
      : this.normalizeOptionalAddress(dto.network, dto.source_address);
    const sourceAddressDisplay = isDeferredTonExchangeRouting
      ? null
      : this.normalizeOptionalDisplayAddress(dto.network, dto.source_address);
    const normalizedReturnAddress = this.normalizeOptionalAddress(dto.network, dto.return_address);
    const returnAddressDisplay = this.normalizeOptionalDisplayAddress(dto.network, dto.return_address);
    const mainAddress = await this.tradersService.resolveMainAddress(
      dto.trader_id,
      dto.network,
      dto.asset_symbol,
    );
    const depositCountForPeriod = await this.prisma.deposit.count({
      where: {
        user_id: userId,
        investment_period_id: dto.investment_period_id,
      },
    });

    if (depositCountForPeriod >= MAX_DEPOSITS_PER_USER_PER_PERIOD) {
      throw new BadRequestException(
        `You have reached the limit of ${MAX_DEPOSITS_PER_USER_PER_PERIOD} cycles for this period`,
      );
    }

    if (!isDeferredTonExchangeRouting && !normalizedSourceAddress) {
      throw new BadRequestException('Source address is required');
    }

    try {
      if (dto.source_address?.trim() && !isDeferredTonExchangeRouting) {
        await this.walletsService.findOrCreate(userId, dto.network, dto.source_address, 'SOURCE');
      }

      if (dto.return_address?.trim()) {
        await this.walletsService.findOrCreate(
          userId,
          dto.network,
          dto.return_address,
          'RETURNING',
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Deposit create wallet conflict user=${userId} network=${dto.network} source=${normalizedSourceAddress} return=${normalizedReturnAddress ?? 'null'} source_input=${dto.source_address} return_input=${dto.return_address ?? 'null'} error=${message}`,
      );
      throw error;
    }

    const depositRoute = `dr_${randomUUID().replace(/-/g, '')}`;
    const routeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const settlementPreference = normalizeSettlementPreference(dto.settlement_preference);
    const tonDepositMemo = dto.network === 'TON'
      ? buildUserTonDepositMemo(userId)
      : dto.ton_deposit_memo?.trim() || null;

    const deposit = await this.prisma.deposit.create({
      data: {
        user_id: userId,
        investment_period_id: dto.investment_period_id,
        trader_id: dto.trader_id,
        trader_main_address_id: mainAddress.trader_main_address_id,
        network: dto.network,
        asset_symbol: dto.asset_symbol,
        source_address: normalizedSourceAddress,
        source_address_display: sourceAddressDisplay,
        return_address: normalizedReturnAddress,
        return_address_display: returnAddressDisplay,
        ton_deposit_memo: tonDepositMemo,
        return_memo: dto.return_memo?.trim() || null,
        settlement_preference: settlementPreference,
        deposit_route: depositRoute,
        requested_amount: dto.requested_amount ? dto.requested_amount.toString() : null,
        route_expires_at: routeExpiresAt,
        status: DepositStatus.AWAITING_TRANSFER,
      } as any,
      include: {
        trader_main_address: true,
      },
    });

    return this.serialize(deposit);
  }

  async cancelByUser(depositId: string, userId: string): Promise<DepositDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
      include: {
        trader_main_address: true,
      },
    });

    if (!deposit || deposit.user_id !== userId) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== DepositStatus.AWAITING_TRANSFER) {
      throw new BadRequestException('Only awaiting-transfer deposits can be cancelled by the user');
    }

    const cancelled = await this.prisma.deposit.update({
      where: { deposit_id: depositId },
      data: {
        status: DepositStatus.CANCELLED,
        status_reason: 'Cancelled by user before transfer',
        cancelled_at: new Date(),
      },
      include: {
        trader_main_address: true,
      },
    });

    return this.serialize(cancelled);
  }


  async updateReturnRouting(
    depositId: string,
    userId: string,
    dto: UpdateDepositReturnRoutingDto,
  ): Promise<DepositDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit || deposit.user_id !== userId) {
      throw new NotFoundException('Deposit not found');
    }

    if (this.isReturnRoutingLocked(deposit.status)) {
      throw new BadRequestException('Return routing can no longer be updated for this deposit');
    }

    const isExchangeRouting = deposit.network === 'TON' && (!deposit.source_address || Boolean(deposit.return_memo) || Boolean(deposit.return_address));
    const normalizedSourceAddress = isExchangeRouting
      ? deposit.source_address ?? null
      : this.normalizeOptionalAddress(deposit.network, dto.source_address) ?? deposit.source_address ?? null;
    const sourceAddressDisplay = isExchangeRouting
      ? deposit.source_address_display ?? null
      : this.normalizeOptionalDisplayAddress(deposit.network, dto.source_address) ?? deposit.source_address_display ?? null;
    const normalizedReturnAddress = isExchangeRouting
      ? this.normalizeOptionalAddress(deposit.network, dto.return_address)
      : deposit.return_address ?? null;
    const returnAddressDisplay = isExchangeRouting
      ? this.normalizeOptionalDisplayAddress(deposit.network, dto.return_address)
      : deposit.return_address_display ?? null;
    const returnMemo = isExchangeRouting ? dto.return_memo?.trim() || null : null;

    if (isExchangeRouting && dto.return_address?.trim()) {
      await this.walletsService.findOrCreate(userId, deposit.network, dto.return_address, 'RETURNING');
    }

    if (!isExchangeRouting && dto.source_address?.trim()) {
      await this.walletsService.findOrCreate(userId, deposit.network, dto.source_address, 'SOURCE');
    }

    const updated = await this.prisma.deposit.update({
      where: { deposit_id: depositId },
      data: {
        source_address: normalizedSourceAddress,
        source_address_display: sourceAddressDisplay,
        return_address: normalizedReturnAddress,
        return_address_display: returnAddressDisplay,
        return_memo: returnMemo,
      } as any,
      include: {
        trader_main_address: true,
      },
    });

    return this.serialize(updated);
  }

  async updateSettlementPreference(
    depositId: string,
    userId: string,
    settlementPreference?: string | null,
  ): Promise<DepositDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit || deposit.user_id !== userId) {
      throw new NotFoundException('Deposit not found');
    }

    if (this.isSettlementLocked(deposit.status)) {
      throw new BadRequestException('Settlement preference can no longer be updated for this deposit');
    }

    const updated = await this.prisma.deposit.update({
      where: { deposit_id: depositId },
      data: {
        settlement_preference: normalizeSettlementPreference(settlementPreference),
      } as any,
      include: {
        trader_main_address: true,
      },
    });

    return this.serialize(updated);
  }

  async transition(depositId: string, toStatus: string, reason?: string): Promise<DepositDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    const fromStatus = deposit.status;

    if (!DepositStateMachine.canTransition(fromStatus, toStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${fromStatus} to ${toStatus}. Allowed: ${DepositStateMachine.getAllowedTransitions(fromStatus).join(', ')}`
      );
    }

    const now = new Date();
    const updateData: any = {
      status: toStatus,
      status_reason: reason,
    };

    if (toStatus === 'DETECTED') updateData.detected_at = now;
    if (toStatus === 'CONFIRMED') updateData.confirmed_at = now;
    if (toStatus === 'ACTIVE') updateData.activated_at = now;
    if (toStatus === 'COMPLETED') updateData.completed_at = now;
    if (toStatus === 'CANCELLED') updateData.cancelled_at = now;

    const updated = await this.prisma.deposit.update({
      where: { deposit_id: depositId },
      data: updateData,
    });

    return this.serialize(updated);
  }

  async findOneByRoute(route: string): Promise<DepositDto | null> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_route: route },
      include: {
        trader_main_address: true,
      },
    });

    if (!deposit) return null;
    return this.serialize(deposit);
  }

  private serialize(deposit: any): DepositDto {
    return {
      deposit_id: deposit.deposit_id,
      user_id: deposit.user_id,
      investment_period_id: deposit.investment_period_id,
      trader_id: deposit.trader_id ?? null,
      trader_main_address_id: deposit.trader_main_address_id ?? null,
      network: deposit.network,
      asset_symbol: deposit.asset_symbol,
      deposit_route: deposit.deposit_route,
      deposit_address: deposit.trader_main_address?.address || this.getDepositAddress(deposit.network),
      source_address: this.getDisplayAddress(
        deposit.network,
        deposit.source_address,
        deposit.source_address_display,
      ),
      return_address: this.getDisplayAddress(
        deposit.network,
        deposit.return_address,
        deposit.return_address_display,
      ),
      ton_deposit_memo: deposit.ton_deposit_memo ?? null,
      return_memo: deposit.return_memo ?? null,
      settlement_preference: normalizeSettlementPreference(deposit.settlement_preference ?? DEFAULT_SETTLEMENT_PREFERENCE),
      auto_renew_trader_id_snapshot: deposit.auto_renew_trader_id_snapshot ?? null,
      auto_renew_network_snapshot: deposit.auto_renew_network_snapshot ?? null,
      auto_renew_asset_symbol_snapshot: deposit.auto_renew_asset_symbol_snapshot ?? null,
      rolled_over_into_deposit_id: deposit.rolled_over_into_deposit_id ?? null,
      rollover_source_deposit_id: deposit.rollover_source_deposit_id ?? null,
      rollover_attempted_at: deposit.rollover_attempted_at?.toISOString() || null,
      rollover_block_reason: deposit.rollover_block_reason ?? null,
      tx_hash: deposit.tx_hash,
      requested_amount: deposit.requested_amount ? parseFloat(deposit.requested_amount.toString()) : null,
      confirmed_amount: deposit.confirmed_amount ? parseFloat(deposit.confirmed_amount.toString()) : null,
      confirmation_count: deposit.confirmation_count,
      status: deposit.status,
      status_reason: deposit.status_reason,
      route_expires_at: deposit.route_expires_at?.toISOString() || null,
      created_at: deposit.created_at.toISOString(),
      detected_at: deposit.detected_at?.toISOString() || null,
      confirmed_at: deposit.confirmed_at?.toISOString() || null,
      activated_at: deposit.activated_at?.toISOString() || null,
      completed_at: deposit.completed_at?.toISOString() || null,
      cancelled_at: deposit.cancelled_at?.toISOString() || null,
    };
  }

  private isSettlementLocked(status: string): boolean {
    return ['REPORT_READY', 'PAYOUT_PENDING', 'PAYOUT_APPROVED', 'PAYOUT_SENT', 'PAYOUT_CONFIRMED'].includes(status);
  }

  private isReturnRoutingLocked(status: string): boolean {
    return ['REPORT_READY', 'PAYOUT_PENDING', 'PAYOUT_APPROVED', 'PAYOUT_SENT', 'PAYOUT_CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(status);
  }

  private getDepositAddress(network: string): string {
    switch (network) {
      case 'BSC':
        return this.configService.get<string>('blockchain.bsc.depositAddress') || '0x1fFFbcda5bB208CbAd95882a9e57FA9354533AaC';
      case 'TRON':
        return this.configService.get<string>('blockchain.tron.depositAddress') || '';
      case 'TON':
        return this.configService.get<string>('blockchain.ton.depositAddress') || '';
      default:
        return '';
    }
  }

  private normalizeAddress(network: string, address: string): string {
    const trimmed = address.trim();
    if (network === 'TON') {
      try {
        return Address.parse(trimmed).toRawString().toLowerCase();
      } catch {
        return trimmed;
      }
    }

    return trimmed.toLowerCase();
  }

  private normalizeOptionalAddress(network: string, address?: string | null): string | null {
    if (!address?.trim()) {
      return null;
    }

    return this.normalizeAddress(network, address);
  }

  private normalizeDisplayAddress(network: string, address: string): string {
    const trimmed = address.trim();
    if (trimmed.length === 0) {
      return trimmed;
    }

    return network === 'TON' ? trimmed : trimmed;
  }

  private normalizeOptionalDisplayAddress(network: string, address?: string | null): string | null {
    if (!address?.trim()) {
      return null;
    }

    return this.normalizeDisplayAddress(network, address);
  }

  private getDisplayAddress(
    network: string,
    rawAddress?: string | null,
    displayAddress?: string | null,
  ): string | null {
    if (!rawAddress) {
      return null;
    }

    if (displayAddress) {
      return displayAddress;
    }

    if (network === 'TON') {
      try {
        return Address.parse(rawAddress).toString();
      } catch {
        return rawAddress;
      }
    }

    return rawAddress;
  }
}
