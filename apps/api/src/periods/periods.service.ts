import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodDto, UpdatePeriodDto } from './dto/period.dto';
import { InvestmentPeriodStatus } from '@prisma/client';
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
    const existing = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
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
      PeriodTransitionGuard.assertCanTransition(existing.status, dto.status);
      updateData.status = dto.status as unknown as InvestmentPeriodStatus;
    }
    if (dto.accepted_networks) updateData.accepted_networks = dto.accepted_networks;
    if (dto.accepted_assets) updateData.accepted_assets = dto.accepted_assets;

    if (Object.keys(updateData).length === 0) {
      return this.serialize(existing);
    }

    const period = await this.prisma.investmentPeriod.update({
      where: { investment_period_id: id },
      data: updateData,
    });

    return this.serialize(period);
  }

  async updateStatus(id: string, status: string) {
    const existing = await this.prisma.investmentPeriod.findUnique({
      where: { investment_period_id: id },
    });

    if (!existing) {
      throw new NotFoundException('Investment period not found');
    }

    if (existing.status === status) {
      return this.serialize(existing);
    }

    PeriodTransitionGuard.assertCanTransition(existing.status, status);

    const period = await this.prisma.investmentPeriod.update({
      where: { investment_period_id: id },
      data: { status: status as InvestmentPeriodStatus },
    });

    return this.serialize(period);
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
