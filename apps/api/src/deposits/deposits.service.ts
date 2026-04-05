import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto, DepositDto, DepositStatus } from './dto/deposit.dto';
import { DepositStateMachine } from './deposit-state-machine';
import { randomUUID } from 'crypto';
import { InvestmentPeriodStatus } from '@prisma/client';

@Injectable()
export class DepositsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findByUser(userId: string): Promise<DepositDto[]> {
    const deposits = await this.prisma.deposit.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return deposits.map((deposit) => this.serialize(deposit));
  }

  async findOne(depositId: string, userId: string): Promise<DepositDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit || deposit.user_id !== userId) {
      throw new NotFoundException('Deposit not found');
    }

    return this.serialize(deposit);
  }

  async findAdminOne(depositId: string): Promise<DepositDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit) {
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

    if (period.status !== InvestmentPeriodStatus.FUNDING) {
      throw new BadRequestException('Investment period is not accepting deposits');
    }

    if (!period.accepted_networks.includes(dto.network)) {
      throw new BadRequestException(`Network ${dto.network} is not supported for this period`);
    }

    if (!period.accepted_assets.includes(dto.asset_symbol)) {
      throw new BadRequestException(`Asset ${dto.asset_symbol} is not supported for this network`);
    }

    const normalizedSourceAddress = dto.source_address.toLowerCase();
    const existingPendingDeposit = await this.prisma.deposit.findFirst({
      where: {
        network: dto.network,
        source_address: normalizedSourceAddress,
        status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING'] },
      },
    });

    if (existingPendingDeposit) {
      throw new BadRequestException('A pending deposit already exists for this source address on this network');
    }

    const depositRoute = `dr_${randomUUID().replace(/-/g, '')}`;
    const routeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const deposit = await this.prisma.deposit.create({
      data: {
        user_id: userId,
        investment_period_id: dto.investment_period_id,
        network: dto.network,
        asset_symbol: dto.asset_symbol,
        source_address: normalizedSourceAddress,
        deposit_route: depositRoute,
        requested_amount: dto.requested_amount ? dto.requested_amount.toString() : null,
        route_expires_at: routeExpiresAt,
        status: DepositStatus.AWAITING_TRANSFER,
      },
    });

    return this.serialize(deposit);
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
    });

    if (!deposit) return null;
    return this.serialize(deposit);
  }

  private serialize(deposit: any): DepositDto {
    return {
      deposit_id: deposit.deposit_id,
      user_id: deposit.user_id,
      investment_period_id: deposit.investment_period_id,
      network: deposit.network,
      asset_symbol: deposit.asset_symbol,
      deposit_route: deposit.deposit_route,
      deposit_address: this.getDepositAddress(deposit.network),
      source_address: deposit.source_address,
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

  private getDepositAddress(network: string): string {
    if (network === 'BSC') {
      return this.configService.get<string>('blockchain.bsc.depositAddress') || '';
    }

    if (network === 'TRON') {
      return this.configService.get<string>('blockchain.tron.depositAddress') || '';
    }

    if (network === 'TON') {
      return this.configService.get<string>('blockchain.ton.depositAddress') || '';
    }

    return '';
  }
}
