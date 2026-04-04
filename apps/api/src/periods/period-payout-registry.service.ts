import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { COUNTABLE_CONFIRMED_USDT_STATUSES } from './period-analytics.service';

type PayoutRegistryItem = {
  payout_registry_item_id: string;
  deposit_id: string;
  network: string;
  asset_symbol: string;
  confirmed_amount_usdt: Prisma.Decimal;
  network_fee_bucket_usdt: Prisma.Decimal;
  network_fee_allocation_usdt: Prisma.Decimal;
  payout_amount_usdt: Prisma.Decimal;
  created_at: Date;
};

type PayoutRegistryRecord = {
  payout_registry_id: string;
  investment_period_id: string;
  settlement_snapshot_id: string;
  generated_at: Date;
  generated_by: string | null;
  items: PayoutRegistryItem[];
  settlement_snapshot?: {
    total_deposits_usdt: Prisma.Decimal;
    net_distributable_usdt: Prisma.Decimal;
    network_fees_json: Prisma.JsonValue;
  } | null;
};

type DepositRecord = {
  deposit_id: string;
  network: string;
  asset_symbol: string;
  confirmed_amount: Prisma.Decimal | number | null;
};

export type PeriodPayoutRegistryItemDto = {
  payout_registry_item_id: string;
  deposit_id: string;
  network: string;
  asset_symbol: string;
  confirmed_amount_usdt: number;
  network_fee_bucket_usdt: number;
  network_fee_allocation_usdt: number;
  payout_amount_usdt: number;
  created_at: string;
};

export type PeriodPayoutRegistryDto = {
  payout_registry_id: string;
  investment_period_id: string;
  settlement_snapshot_id: string;
  generated_at: string;
  generated_by: string | null;
  totalDepositsUsdt: number;
  netDistributableUsdt: number;
  networkFeesUsdt: {
    TRON: number;
    TON: number;
    BSC: number;
  };
  items: PeriodPayoutRegistryItemDto[];
};

const ZERO = new Prisma.Decimal(0);

@Injectable()
export class PeriodPayoutRegistryService {
  constructor(private readonly prisma: PrismaService) {}

  async getRegistry(periodId: string): Promise<PeriodPayoutRegistryDto | null> {
    const prisma = this.prisma as any;
    const registry = await prisma.periodPayoutRegistry.findUnique({
      where: { investment_period_id: periodId },
      include: {
        items: true,
        settlement_snapshot: true,
      },
    });

    return registry ? this.serialize(registry as PayoutRegistryRecord) : null;
  }

  async generate(periodId: string, generatedBy?: string | null): Promise<PeriodPayoutRegistryDto> {
    const prisma = this.prisma as any;
    const existing = await prisma.periodPayoutRegistry.findUnique({
      where: { investment_period_id: periodId },
      include: {
        items: true,
        settlement_snapshot: true,
      },
    });

    if (existing) {
      return this.serialize(existing as PayoutRegistryRecord);
    }

    const period = await prisma.investmentPeriod.findUnique({
      where: { investment_period_id: periodId },
      include: {
        settlement_snapshot: true,
      },
    });

    if (!period) {
      throw new NotFoundException('Investment period not found');
    }

    if (!period.settlement_snapshot?.approved_at) {
      throw new BadRequestException('An approved settlement snapshot is required before generating a payout registry');
    }

    const snapshot = period.settlement_snapshot;
    const totalDepositsUsdt = this.decimal(snapshot.total_deposits_usdt);

    const networkFees = this.normalizeFees(snapshot.network_fees_json);
    const networkFeeDecimals = {
      TRON: new Prisma.Decimal(networkFees.TRON),
      TON: new Prisma.Decimal(networkFees.TON),
      BSC: new Prisma.Decimal(networkFees.BSC),
    };
    const deposits = (await prisma.deposit.findMany({
      where: {
        investment_period_id: periodId,
        asset_symbol: 'USDT',
        confirmed_amount: { not: null },
        confirmed_at: { not: null },
        status: { in: [...COUNTABLE_CONFIRMED_USDT_STATUSES] },
      },
      orderBy: [{ network: 'asc' }, { deposit_id: 'asc' }],
      select: {
        deposit_id: true,
        network: true,
        asset_symbol: true,
        confirmed_amount: true,
      },
    })) as DepositRecord[];

    const networkTotals = deposits.reduce((acc: Record<string, Prisma.Decimal>, deposit: DepositRecord) => {
      const network = deposit.network;
      const amount = this.decimal(deposit.confirmed_amount);
      acc[network] = (acc[network] || ZERO).add(amount);
      return acc;
    }, {} as Record<string, Prisma.Decimal>);

    const items = deposits.map((deposit: DepositRecord) => {
      const confirmedAmount = this.decimal(deposit.confirmed_amount);
      const networkKey = deposit.network as keyof PeriodPayoutRegistryDto['networkFeesUsdt'];
      const networkBucket = networkFeeDecimals[networkKey] || ZERO;
      const networkTotal = networkTotals[deposit.network] || ZERO;
      const networkFeeAllocation = networkTotal.isZero()
        ? ZERO
        : networkBucket.mul(confirmedAmount).div(networkTotal);
      const payoutAmount = totalDepositsUsdt.isZero()
        ? ZERO
        : this.decimal(snapshot.net_distributable_usdt).mul(confirmedAmount).div(totalDepositsUsdt);

      return {
        deposit_id: deposit.deposit_id,
        network: deposit.network,
        asset_symbol: deposit.asset_symbol,
        confirmed_amount_usdt: confirmedAmount,
        network_fee_bucket_usdt: networkBucket,
        network_fee_allocation_usdt: networkFeeAllocation,
        payout_amount_usdt: payoutAmount,
      };
    });

    try {
      const registry = await prisma.$transaction(async (tx: any) => tx.periodPayoutRegistry.create({
        data: {
          investment_period_id: periodId,
          settlement_snapshot_id: snapshot.settlement_snapshot_id,
          generated_by: generatedBy || null,
          items: {
            create: items,
          },
        },
        include: {
          items: true,
          settlement_snapshot: true,
        },
      }));

      return this.serialize(registry as PayoutRegistryRecord);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const created = await prisma.periodPayoutRegistry.findUnique({
          where: { investment_period_id: periodId },
          include: {
            items: true,
            settlement_snapshot: true,
          },
        });

        if (created) {
          return this.serialize(created as PayoutRegistryRecord);
        }
      }

      throw error;
    }
  }

  private serialize(registry: PayoutRegistryRecord): PeriodPayoutRegistryDto {
    const snapshot = registry.settlement_snapshot;
    return {
      payout_registry_id: registry.payout_registry_id,
      investment_period_id: registry.investment_period_id,
      settlement_snapshot_id: registry.settlement_snapshot_id,
      generated_at: registry.generated_at.toISOString(),
      generated_by: registry.generated_by || null,
      totalDepositsUsdt: this.toNumber(snapshot?.total_deposits_usdt),
      netDistributableUsdt: this.toNumber(snapshot?.net_distributable_usdt),
      networkFeesUsdt: this.normalizeFees(snapshot?.network_fees_json),
      items: registry.items.map((item) => ({
        payout_registry_item_id: item.payout_registry_item_id,
        deposit_id: item.deposit_id,
        network: item.network,
        asset_symbol: item.asset_symbol,
        confirmed_amount_usdt: this.toNumber(item.confirmed_amount_usdt),
        network_fee_bucket_usdt: this.toNumber(item.network_fee_bucket_usdt),
        network_fee_allocation_usdt: this.toNumber(item.network_fee_allocation_usdt),
        payout_amount_usdt: this.toNumber(item.payout_amount_usdt),
        created_at: item.created_at.toISOString(),
      })),
    };
  }

  private normalizeFees(value: Prisma.JsonValue | null | undefined): PeriodPayoutRegistryDto['networkFeesUsdt'] {
    const fees = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
    return {
      TRON: this.toNumber(fees.TRON as any),
      TON: this.toNumber(fees.TON as any),
      BSC: this.toNumber(fees.BSC as any),
    };
  }

  private decimal(value: Prisma.Decimal | number | null | undefined): Prisma.Decimal {
    if (value == null) {
      return ZERO;
    }
    if (value instanceof Prisma.Decimal) return value;
    return new Prisma.Decimal(value);
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined): number {
    if (value == null) return 0;
    if (typeof value === 'number') return value;
    return value.toNumber();
  }
}
