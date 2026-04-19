import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayoutDto, PayoutDto } from './dto/payout.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class PayoutsService {
  private readonly minimumPayoutThreshold = 5;

  constructor(private prisma: PrismaService) {}

  async findByDeposit(depositId: string): Promise<PayoutDto[]> {
    const payouts = await this.prisma.payout.findMany({
      where: { deposit_id: depositId },
      orderBy: { created_at: 'desc' },
    });

    return payouts.map(this.serialize);
  }

  async prepareForDeposit(depositId: string, preparedBy: string): Promise<PayoutDto> {
    const deposit = await this.prisma.deposit.findUnique({
      where: { deposit_id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== 'REPORT_READY') {
      throw new BadRequestException('Deposit must have a published report before payout');
    }

    const existing = await this.prisma.payout.findFirst({
      where: {
        deposit_id: depositId,
        status: { notIn: ['CANCELLED', 'FAILED'] },
      },
    });

    if (existing) {
      throw new BadRequestException('Payout already exists for this deposit');
    }

    const destinationAddress = deposit.return_address || deposit.source_address || '';
    if (!destinationAddress) {
      throw new BadRequestException('No destination address available for payout');
    }

    const balancePreparation = await this.prepareHeldBalancePayout(deposit, preparedBy, destinationAddress);
    if (balancePreparation) {
      await this.prisma.deposit.update({
        where: { deposit_id: depositId },
        data: { status: 'PAYOUT_PENDING' },
      });

      return balancePreparation;
    }

    const report = await this.prisma.profitLossReport.findUnique({
      where: { deposit_id: depositId },
    });

    if (!report || (report.status !== 'APPROVED' && report.status !== 'PUBLISHED')) {
      throw new BadRequestException('Report must be approved before payout');
    }

    const payout = await this.prisma.payout.create({
      data: {
        deposit_id: depositId,
        destination_address: destinationAddress,
        destination_rule: 'ORIGINAL_SENDER',
        amount: report.payout_amount,
        network: deposit.network,
        asset_symbol: deposit.asset_symbol,
        prepared_by: preparedBy,
        status: 'PENDING_APPROVAL',
      },
    });

    await this.prisma.deposit.update({
      where: { deposit_id: depositId },
      data: { status: 'PAYOUT_PENDING' },
    });

    return this.serialize(payout);
  }

  private async prepareHeldBalancePayout(deposit: any, preparedBy: string, destinationAddress: string): Promise<PayoutDto | null> {
    const networkSuffix = deposit.network === 'TON' ? 'ton' : 'bsc';
    const user = await (this.prisma as any).user.findUnique({
      where: { user_id: deposit.user_id },
      select: {
        referral_payout_preference: true,
        [`held_cycle_balance_${networkSuffix}`]: true,
        [`held_referral_balance_${networkSuffix}`]: true,
      },
    });

    const cycleBalance = this.parseAmount(user?.[`held_cycle_balance_${networkSuffix}`]);
    const rawReferralBalance = this.parseAmount(user?.[`held_referral_balance_${networkSuffix}`]);
    const referralBalance = user?.referral_payout_preference === 'WITHDRAW'
      ? rawReferralBalance
      : 0;
    const totalBalance = this.round2(cycleBalance + referralBalance);

    if (totalBalance <= 0) {
      return null;
    }

    if (totalBalance < this.minimumPayoutThreshold) {
      throw new BadRequestException(`Payout amount is below the minimum threshold of $${this.minimumPayoutThreshold}`);
    }

    const sourceSummary = [
      cycleBalance > 0 ? 'cycle' : null,
      referralBalance > 0 ? 'referral' : null,
    ].filter(Boolean).join('+') || null;

    const payout = await this.prisma.payout.create({
      data: {
        deposit_id: deposit.deposit_id,
        destination_address: destinationAddress,
        destination_rule: 'ORIGINAL_SENDER',
        amount: totalBalance.toString(),
        network: deposit.network,
        asset_symbol: deposit.asset_symbol,
        prepared_by: preparedBy,
        status: 'PENDING_APPROVAL',
      } as any,
    });

    const nextCycleBalance = 0;
    const remainingForReferral = this.round2(Math.max(totalBalance - cycleBalance, 0));
    const nextReferralBalance = user?.referral_payout_preference === 'WITHDRAW'
      ? this.round2(Math.max(referralBalance - remainingForReferral, 0))
      : rawReferralBalance;

    await (this.prisma as any).user.update({
      where: { user_id: deposit.user_id },
      data: {
        [`held_cycle_balance_${networkSuffix}`]: nextCycleBalance.toFixed(2),
        [`held_referral_balance_${networkSuffix}`]: nextReferralBalance.toFixed(2),
      },
    });

    return this.serialize({
      ...payout,
      balance_source_summary: sourceSummary,
    });
  }

  async prepareBatch(depositIds: string[], preparedBy: string): Promise<PayoutDto[]> {
    const batchId = `batch_${randomUUID().replace(/-/g, '')}`;
    const payouts: PayoutDto[] = [];

    for (const depositId of depositIds) {
      try {
        const payout = await this.prepareForDeposit(depositId, preparedBy);
        await this.prisma.payout.update({
          where: { payout_id: payout.payout_id },
          data: { payout_batch_id: batchId },
        });
        payouts.push({ ...payout, payout_batch_id: batchId });
      } catch (error: any) {
        console.error(`Failed to prepare payout for ${depositId}: ${error.message}`);
      }
    }

    return payouts;
  }

  async approve(payoutId: string, approvedBy: string): Promise<PayoutDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { payout_id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Payout must be pending approval');
    }

    if (payout.prepared_by === approvedBy) {
      throw new BadRequestException('Cannot approve your own payout (separation of duties)');
    }

    const updated = await this.prisma.payout.update({
      where: { payout_id: payoutId },
      data: {
        status: 'APPROVED',
        approved_by: approvedBy,
        approved_at: new Date(),
      },
    });

    await this.prisma.deposit.update({
      where: { deposit_id: payout.deposit_id },
      data: { status: 'PAYOUT_APPROVED' },
    });

    return this.serialize(updated);
  }

  async recordSent(payoutId: string, txHash: string, sentBy: string): Promise<PayoutDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { payout_id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'APPROVED') {
      throw new BadRequestException('Payout must be approved before sending');
    }

    const updated = await this.prisma.payout.update({
      where: { payout_id: payoutId },
      data: {
        status: 'SENT',
        tx_hash: txHash,
        sent_by: sentBy,
        sent_at: new Date(),
      },
    });

    await this.prisma.deposit.update({
      where: { deposit_id: payout.deposit_id },
      data: { status: 'PAYOUT_SENT' },
    });

    return this.serialize(updated);
  }

  async recordConfirmed(payoutId: string): Promise<PayoutDto> {
    const payout = await this.prisma.payout.findUnique({
      where: { payout_id: payoutId },
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.status !== 'SENT') {
      throw new BadRequestException('Payout must be in SENT status');
    }

    const updated = await this.prisma.payout.update({
      where: { payout_id: payoutId },
      data: {
        status: 'CONFIRMED',
        blockchain_status: 'confirmed',
        confirmed_at: new Date(),
      },
    });

    await this.prisma.deposit.update({
      where: { deposit_id: payout.deposit_id },
      data: { status: 'PAYOUT_CONFIRMED' },
    });

    return this.serialize(updated);
  }

  async recordFailure(payoutId: string, reason: string): Promise<PayoutDto> {
    const updated = await this.prisma.payout.update({
      where: { payout_id: payoutId },
      data: {
        status: 'FAILED',
        failure_reason: reason,
      },
    });

    return this.serialize(updated);
  }

  private serialize(payout: any): PayoutDto {
    return {
      payout_id: payout.payout_id,
      deposit_id: payout.deposit_id,
      payout_batch_id: payout.payout_batch_id,
      balance_source_summary: payout.balance_source_summary ?? null,
      destination_address: payout.destination_address,
      destination_rule: payout.destination_rule,
      amount: parseFloat(payout.amount.toString()),
      network: payout.network,
      asset_symbol: payout.asset_symbol,
      tx_hash: payout.tx_hash,
      blockchain_status: payout.blockchain_status,
      status: payout.status,
      failure_reason: payout.failure_reason,
      prepared_by: payout.prepared_by,
      approved_by: payout.approved_by,
      sent_by: payout.sent_by,
      created_at: payout.created_at.toISOString(),
      approved_at: payout.approved_at?.toISOString() || null,
      sent_at: payout.sent_at?.toISOString() || null,
      confirmed_at: payout.confirmed_at?.toISOString() || null,
    };
  }

  private parseAmount(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }

    const parsed = Number.parseFloat(value.toString());
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
