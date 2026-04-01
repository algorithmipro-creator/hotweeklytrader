import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BindWalletDto, UnbindWalletDto, WalletDto } from './dto/wallet.dto';

@Injectable()
export class WalletsService {
  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string): Promise<WalletDto[]> {
    const wallets = await this.prisma.wallet.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return wallets.map(this.serialize);
  }

  async bind(userId: string, dto: BindWalletDto): Promise<WalletDto> {
    const normalizedAddress = dto.source_address.trim().toLowerCase();

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
        payout_address: dto.payout_address || null,
        verification_status: 'unverified',
      },
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
        source_address: address.toLowerCase(),
      },
    });

    if (!wallet) return null;
    return this.serialize(wallet);
  }

  private serialize(wallet: any): WalletDto {
    return {
      wallet_id: wallet.wallet_id,
      user_id: wallet.user_id,
      network: wallet.network,
      source_address: wallet.source_address,
      payout_address: wallet.payout_address,
      verification_status: wallet.verification_status,
      first_seen_at: wallet.first_seen_at.toISOString(),
      last_used_at: wallet.last_used_at?.toISOString() || null,
      created_at: wallet.created_at.toISOString(),
      updated_at: wallet.updated_at.toISOString(),
    };
  }
}
