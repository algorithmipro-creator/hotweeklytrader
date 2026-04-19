import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Address } from '@ton/core';
import { PrismaService } from '../prisma/prisma.service';
import { BindWalletDto, UnbindWalletDto, WalletDto } from './dto/wallet.dto';

type WalletRole = 'SOURCE' | 'RETURNING' | 'BOTH';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string): Promise<WalletDto[]> {
    const wallets = await this.prisma.wallet.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return wallets.map((wallet) => this.serialize(wallet));
  }

  async bind(userId: string, dto: BindWalletDto): Promise<WalletDto> {
    const normalizedAddress = this.normalizeAddress(dto.network, dto.source_address);
    const displayAddress = this.normalizeDisplayAddress(dto.network, dto.source_address);

    const existing = await this.prisma.wallet.findFirst({
      where: {
        network: dto.network,
        source_address: normalizedAddress,
      },
    });

    if (existing && existing.user_id !== userId) {
      throw new ConflictException(
        `Address ${dto.source_address} is already bound to another user on ${dto.network} network`,
      );
    }

    if (existing && existing.user_id === userId) {
      throw new ConflictException(
        `Address ${dto.source_address} is already bound to your account on ${dto.network} network`,
      );
    }

    const wallet = await this.prisma.wallet.create({
      data: {
        user_id: userId,
        network: dto.network,
        source_address: normalizedAddress,
        display_address: displayAddress,
        payout_address: dto.payout_address || null,
        wallet_role: 'SOURCE',
        verification_status: 'unverified',
      } as any,
    });

    return this.serialize(wallet);
  }

  async unbind(userId: string, walletId: string): Promise<void> {
    const wallet = await this.prisma.wallet.findFirst({
      where: { wallet_id: walletId, user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found or does not belong to you');
    }

    const hasActiveDeposits = await this.prisma.deposit.findFirst({
      where: {
        user_id: userId,
        source_address: wallet.source_address,
        status: { in: ['AWAITING_TRANSFER', 'DETECTED', 'CONFIRMING', 'CONFIRMED', 'ACTIVE'] },
      },
    });

    if (hasActiveDeposits) {
      throw new BadRequestException(
        'Cannot unbind address while there are active deposits linked to it',
      );
    }

    await this.prisma.wallet.delete({
      where: { wallet_id: walletId },
    });
  }

  async findByAddress(network: string, address: string): Promise<WalletDto | null> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        network,
        source_address: this.normalizeAddress(network, address),
      },
    });

    if (!wallet) return null;
    return this.serialize(wallet);
  }

  async findOrCreate(
    userId: string,
    network: string,
    address: string,
    requestedRole: 'SOURCE' | 'RETURNING' = 'SOURCE',
  ): Promise<WalletDto> {
    const normalizedAddress = this.normalizeAddress(network, address);
    const displayAddress = this.formatAddressForDisplay(network, normalizedAddress);
    const requestedDisplayAddress = this.normalizeDisplayAddress(network, address);
    const existing = await this.prisma.wallet.findFirst({
      where: {
        network,
        source_address: normalizedAddress,
      },
    });

    if (existing) {
      if (existing.user_id !== userId) {
        throw new ConflictException(
          `Address ${displayAddress} is already bound to another user on ${network} network`,
        );
      }

      const currentRole = ((existing as any).wallet_role ?? 'SOURCE') as WalletRole;
      const nextRole = this.mergeWalletRole(currentRole, requestedRole);
      const shouldRefreshDisplayAddress =
        !!requestedDisplayAddress && (existing as any).display_address !== requestedDisplayAddress;

      if (nextRole !== currentRole || shouldRefreshDisplayAddress) {
        const updated = await this.prisma.wallet.update({
          where: { wallet_id: existing.wallet_id },
          data: {
            wallet_role: nextRole,
            ...(shouldRefreshDisplayAddress ? { display_address: requestedDisplayAddress } : {}),
          } as any,
        });

        return this.serialize(updated);
      }

      return this.serialize(existing);
    }

    const wallet = await this.prisma.wallet.create({
      data: {
        user_id: userId,
        network,
        source_address: normalizedAddress,
        display_address: requestedDisplayAddress,
        payout_address: null,
        wallet_role: requestedRole,
        verification_status: 'unverified',
      } as any,
    });

    return this.serialize(wallet);
  }

  private serialize(wallet: any): WalletDto {
    return {
      wallet_id: wallet.wallet_id,
      user_id: wallet.user_id,
      network: wallet.network,
      source_address: wallet.display_address ?? this.formatAddressForDisplay(wallet.network, wallet.source_address),
      payout_address: wallet.payout_address,
      wallet_role: wallet.wallet_role ?? 'SOURCE',
      verification_status: wallet.verification_status,
      first_seen_at: wallet.first_seen_at.toISOString(),
      last_used_at: wallet.last_used_at?.toISOString() || null,
      created_at: wallet.created_at.toISOString(),
      updated_at: wallet.updated_at.toISOString(),
    };
  }

  private mergeWalletRole(currentRole: WalletRole, requestedRole: 'SOURCE' | 'RETURNING'): WalletRole {
    if (currentRole === 'BOTH' || currentRole === requestedRole) {
      return currentRole;
    }

    return 'BOTH';
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

  private normalizeDisplayAddress(network: string, address: string): string {
    const trimmed = address.trim();
    if (trimmed.length === 0) {
      return trimmed;
    }

    return network === 'TON' ? trimmed : trimmed;
  }

  private formatAddressForDisplay(network: string, address: string): string {
    if (network === 'TON') {
      try {
        return Address.parse(address).toString();
      } catch {
        return address;
      }
    }

    return address;
  }
}
