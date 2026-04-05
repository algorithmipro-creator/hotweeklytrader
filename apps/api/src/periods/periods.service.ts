import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodDto, UpdatePeriodDto } from './dto/period.dto';
import { InvestmentPeriodStatus, PayoutStatus } from '@prisma/client';
import { PeriodTransitionGuard } from './period-transition.guard';

@Injectable()
export class PeriodsService {
  constructor(private prisma: PrismaService) {}

  async findAll(status?: string) {
    const where = status && status !== 'ALL'
      ? { status: status as InvestmentPeriodStatus }
      : status === 'ALL'
        ? undefined
        : { status: InvestmentPeriodStatus.TRADING_ACTIVE };

    const periods = await this.prisma.investmentPeriod.findMany({
      where,
      orderBy: { start_date: 'asc' },
    });

    return periods.map(this.serialize);
  }

  async findOne(id: string) {
    const period = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
    });

    if (!period) {
      throw new NotFoundException('Investment period not found');
    }

    return this.serialize(period);
  }

  async create(dto: CreatePeriodDto, createdBy?: string) {
    const period = await this.prisma.investmentPeriod.create({
      data: {
        title: dto.title,
        period_type: dto.period_type,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        lock_date: dto.lock_date ? new Date(dto.lock_date) : null,
        accepted_networks: dto.accepted_networks,
        accepted_assets: dto.accepted_assets,
        status: InvestmentPeriodStatus.FUNDING,
        minimum_amount_rules: dto.minimum_amount_rules
          ? JSON.parse(JSON.stringify(dto.minimum_amount_rules))
          : null,
        maximum_amount_rules: dto.maximum_amount_rules
          ? JSON.parse(JSON.stringify(dto.maximum_amount_rules))
          : null,
        created_by: createdBy,
      },
    });

    return this.serialize(period);
  }

  async update(id: string, dto: UpdatePeriodDto) {
    const prisma = this.prisma as any;
    const existing = await prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
      include: {
        settlement_snapshot: true,
        payout_registry: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Investment period not found');
    }

    const updateData: any = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.start_date) updateData.start_date = new Date(dto.start_date);
    if (dto.end_date) updateData.end_date = new Date(dto.end_date);
    if (dto.lock_date) updateData.lock_date = new Date(dto.lock_date);
    if (dto.status && dto.status !== existing.status) {
      this.assertAllowedStatusTransition(existing, dto.status);
      updateData.status = dto.status as unknown as InvestmentPeriodStatus;
    }
    if (dto.accepted_networks) updateData.accepted_networks = dto.accepted_networks;
    if (dto.accepted_assets) updateData.accepted_assets = dto.accepted_assets;

    if (Object.keys(updateData).length === 0) {
      return this.serialize(existing);
    }

    const period = await prisma.investmentPeriod.update({
      where: { investment_period_id: id },
      data: updateData,
    });

    return this.serialize(period);
  }

  async updateStatus(id: string, status: string) {
    const investmentPeriod = this.prisma.investmentPeriod as any;
    const findUnique = investmentPeriod.findUnique as (...args: any[]) => Promise<any>;
    const update = investmentPeriod.update as (...args: any[]) => Promise<any>;
    const existing = await findUnique({
      where: { investment_period_id: id },
      include: {
        settlement_snapshot: true,
        payout_registry: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Investment period not found');
    }

    if (existing.status === status) {
      return this.serialize(existing);
    }

    this.assertAllowedStatusTransition(existing, status);

    const period = await update({
      where: { investment_period_id: id },
      data: { status: status as InvestmentPeriodStatus },
    });

    return this.serialize(period);
  }

  private assertAllowedStatusTransition(period: any, nextStatus: string) {
    PeriodTransitionGuard.assertCanTransition(period.status, nextStatus);

    if (period.status === InvestmentPeriodStatus.REPORTING && nextStatus === InvestmentPeriodStatus.PAYOUT_IN_PROGRESS) {
      this.assertApprovedSettlement(period);
    }

    if (period.status === InvestmentPeriodStatus.PAYOUT_IN_PROGRESS && nextStatus === InvestmentPeriodStatus.CLOSED) {
      this.assertResolvedPayoutRegistry(period);
    }
  }

  private assertApprovedSettlement(period: any) {
    if (!period.settlement_snapshot?.approved_at) {
      throw new BadRequestException('An approved settlement snapshot is required before opening payouts');
    }
  }

  private assertResolvedPayoutRegistry(period: any) {
    const registry = period.payout_registry;

    if (!registry) {
      throw new BadRequestException('A payout registry must exist before closing the period');
    }

    const unresolvedStatuses = [
      PayoutStatus.PREPARED,
      PayoutStatus.PENDING_APPROVAL,
      PayoutStatus.APPROVED,
      PayoutStatus.SENT,
    ];
    const unresolved = (registry.items || []).filter((item: any) => unresolvedStatuses.includes(item.status));
    if (unresolved.length > 0) {
      throw new BadRequestException('All payout registry items must be resolved before closing the period');
    }
  }

  private serialize(period: any) {
    return {
      ...period,
      start_date: period.start_date.toISOString(),
      end_date: period.end_date.toISOString(),
      lock_date: period.lock_date?.toISOString() || null,
      created_at: period.created_at.toISOString(),
      updated_at: period.updated_at.toISOString(),
    };
  }
}
