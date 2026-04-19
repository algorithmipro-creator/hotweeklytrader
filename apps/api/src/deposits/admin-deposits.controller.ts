import {
  Controller, Get, Put, Delete, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { DepositsService } from './deposits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { DepositDto, TransitionDepositDto } from './dto/deposit.dto';

@Controller('admin/deposits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminDepositsController {
  constructor(private depositsService: DepositsService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('network') network?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (network) where.network = network;

    const deposits = await (this.depositsService as any).prisma.deposit.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
    });

    return deposits.map((d: any) => ({
      ...d,
      requested_amount: d.requested_amount ? parseFloat(d.requested_amount.toString()) : null,
      confirmed_amount: d.confirmed_amount ? parseFloat(d.confirmed_amount.toString()) : null,
      created_at: d.created_at.toISOString(),
      detected_at: d.detected_at?.toISOString() || null,
      confirmed_at: d.confirmed_at?.toISOString() || null,
      activated_at: d.activated_at?.toISOString() || null,
      completed_at: d.completed_at?.toISOString() || null,
      route_expires_at: d.route_expires_at?.toISOString() || null,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DepositDto> {
    const deposit = await (this.depositsService as any).prisma.deposit.findUnique({
      where: { deposit_id: id },
    });

    if (!deposit) {
      throw new Error('Deposit not found');
    }

    return (this.depositsService as any).serialize(deposit);
  }

  @Put(':id/status')
  async transition(
    @Param('id') id: string,
    @Body() dto: TransitionDepositDto,
  ): Promise<DepositDto> {
    return this.depositsService.transition(id, dto.status, dto.reason);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ deleted: boolean }> {
    await (this.depositsService as any).prisma.deposit.delete({
      where: { deposit_id: id },
    });
    return { deleted: true };
  }
}
