import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTraderDto,
  TraderDto,
  TraderMainAddressDto,
  UpdateTraderDto,
  UpsertTraderMainAddressDto,
} from './dto/trader.dto';

@Injectable()
export class TradersService {
  constructor(private prisma: PrismaService) {}

  async findAllActive(): Promise<TraderDto[]> {
    const traders = await this.prisma.trader.findMany({
      where: { status: 'ACTIVE' },
      include: {
        main_addresses: {
          where: { is_active: true },
          orderBy: [{ network: 'asc' }, { asset_symbol: 'asc' }],
        },
      },
      orderBy: { display_name: 'asc' },
    });

    return traders.map((trader) => this.serializeTrader(trader));
  }

  async findAllForAdmin(): Promise<TraderDto[]> {
    const traders = await this.prisma.trader.findMany({
      include: {
        main_addresses: {
          orderBy: [{ is_active: 'desc' }, { network: 'asc' }, { asset_symbol: 'asc' }],
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return traders.map((trader) => this.serializeTrader(trader));
  }

  async findOneBySlug(slug: string): Promise<TraderDto> {
    const trader = await this.prisma.trader.findUnique({
      where: { slug },
      include: {
        main_addresses: {
          where: { is_active: true },
          orderBy: [{ network: 'asc' }, { asset_symbol: 'asc' }],
        },
      },
    });

    if (!trader || trader.status !== 'ACTIVE') {
      throw new NotFoundException('Trader not found');
    }

    return this.serializeTrader(trader);
  }

  async findOneById(traderId: string): Promise<TraderDto> {
    const trader = await this.prisma.trader.findUnique({
      where: { trader_id: traderId },
      include: {
        main_addresses: {
          orderBy: [{ is_active: 'desc' }, { network: 'asc' }, { asset_symbol: 'asc' }],
        },
      },
    });

    if (!trader) {
      throw new NotFoundException('Trader not found');
    }

    return this.serializeTrader(trader);
  }

  async create(dto: CreateTraderDto): Promise<TraderDto> {
    const trader = await this.prisma.trader.create({
      data: {
        nickname: dto.nickname,
        slug: dto.slug,
        display_name: dto.display_name,
        description: dto.description ?? null,
        profile_title: dto.profile_title ?? 'semper in motu ai',
        status: dto.status ?? 'ACTIVE',
      },
      include: {
        main_addresses: true,
      },
    });

    return this.serializeTrader(trader);
  }

  async update(traderId: string, dto: UpdateTraderDto): Promise<TraderDto> {
    await this.ensureTraderExists(traderId);

    const trader = await this.prisma.trader.update({
      where: { trader_id: traderId },
      data: {
        nickname: dto.nickname,
        slug: dto.slug,
        display_name: dto.display_name,
        description: dto.description,
        profile_title: dto.profile_title,
        status: dto.status,
      },
      include: {
        main_addresses: true,
      },
    });

    return this.serializeTrader(trader);
  }

  async upsertMainAddress(
    traderId: string,
    dto: UpsertTraderMainAddressDto,
  ): Promise<TraderMainAddressDto> {
    await this.ensureTraderExists(traderId);

    if (dto.is_active ?? true) {
      await this.prisma.traderMainAddress.updateMany({
        where: {
          trader_id: traderId,
          network: dto.network,
          asset_symbol: dto.asset_symbol,
          is_active: true,
        },
        data: { is_active: false },
      });
    }

    const record = await this.prisma.traderMainAddress.create({
      data: {
        trader_id: traderId,
        network: dto.network,
        asset_symbol: dto.asset_symbol,
        address: this.normalizeAddress(dto.network, dto.address),
        is_active: dto.is_active ?? true,
      },
    });

    return this.serializeMainAddress(record);
  }

  async resolveMainAddress(
    traderId: string,
    network: string,
    assetSymbol: string,
  ): Promise<TraderMainAddressDto> {
    const record = await this.prisma.traderMainAddress.findFirst({
      where: {
        trader_id: traderId,
        network,
        asset_symbol: assetSymbol,
        is_active: true,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!record) {
      throw new BadRequestException(
        'Selected trader does not have an active main address for this network and asset',
      );
    }

    return this.serializeMainAddress(record);
  }

  private async ensureTraderExists(traderId: string): Promise<void> {
    const trader = await this.prisma.trader.findUnique({
      where: { trader_id: traderId },
      select: { trader_id: true },
    });

    if (!trader) {
      throw new NotFoundException('Trader not found');
    }
  }

  private serializeTrader(trader: any): TraderDto {
    return {
      trader_id: trader.trader_id,
      nickname: trader.nickname,
      slug: trader.slug,
      display_name: trader.display_name,
      description: trader.description ?? null,
      profile_title: trader.profile_title,
      status: trader.status,
      main_addresses: trader.main_addresses?.map((item: any) => this.serializeMainAddress(item)) ?? [],
    };
  }

  private serializeMainAddress(address: any): TraderMainAddressDto {
    return {
      trader_main_address_id: address.trader_main_address_id,
      trader_id: address.trader_id,
      network: address.network,
      asset_symbol: address.asset_symbol,
      address: address.address,
      is_active: address.is_active,
    };
  }

  private normalizeAddress(network: string, address: string): string {
    const trimmed = address.trim();
    if (network === 'TON') {
      return trimmed;
    }

    return trimmed.toLowerCase();
  }
}
