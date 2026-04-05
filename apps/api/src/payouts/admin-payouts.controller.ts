import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePayoutDto, CreateBatchDto, PayoutDto } from './dto/payout.dto';

@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminPayoutsController {
  constructor(private payoutsService: PayoutsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('batch_id') batchId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (batchId) where.payout_batch_id = batchId;

    const payouts = await (this.payoutsService as any).prisma.payout.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
    });

    return payouts.map((p: any) => ({
      ...p,
      amount: parseFloat(p.amount.toString()),
      created_at: p.created_at.toISOString(),
      approved_at: p.approved_at?.toISOString() || null,
      sent_at: p.sent_at?.toISOString() || null,
      confirmed_at: p.confirmed_at?.toISOString() || null,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PayoutDto> {
    const payout = await (this.payoutsService as any).prisma.payout.findUnique({
      where: { payout_id: id },
    });

    if (!payout) throw new Error('Payout not found');
    return (this.payoutsService as any).serialize(payout);
  }

  @Post()
  async create(
    @Body() dto: CreatePayoutDto,
    @CurrentUser() user: any,
  ): Promise<PayoutDto> {
    return this.payoutsService.prepareForDeposit(dto.deposit_id, user.user_id);
  }

  @Post('batch')
  async createBatch(
    @Body() dto: CreateBatchDto,
    @CurrentUser() user: any,
  ): Promise<PayoutDto[]> {
    return this.payoutsService.prepareBatch(dto.deposit_ids, user.user_id);
  }

  @Put(':id/approve')
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<PayoutDto> {
    return this.payoutsService.approve(id, user.user_id);
  }

  @Put(':id/sent')
  async recordSent(
    @Param('id') id: string,
    @Body('tx_hash') txHash: string,
    @CurrentUser() user: any,
  ): Promise<PayoutDto> {
    return this.payoutsService.recordSent(id, txHash, user.user_id);
  }

  @Put(':id/confirmed')
  async recordConfirmed(@Param('id') id: string): Promise<PayoutDto> {
    return this.payoutsService.recordConfirmed(id);
  }

  @Put(':id/failed')
  async recordFailure(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ): Promise<PayoutDto> {
    return this.payoutsService.recordFailure(id, reason);
  }
}
