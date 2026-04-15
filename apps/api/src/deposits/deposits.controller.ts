import {
  Controller, Get, Post, Put, Body, Param, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DepositsService } from './deposits.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateDepositDto, DepositDto } from './dto/deposit.dto';

@Controller('deposits')
@UseGuards(JwtAuthGuard)
export class DepositsController {
  constructor(private depositsService: DepositsService) {}

  @Get()
  async findAll(@CurrentUser() user: any): Promise<DepositDto[]> {
    return this.depositsService.findByUser(user.user_id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<DepositDto> {
    return this.depositsService.findOne(id, user.user_id);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @Body() dto: CreateDepositDto,
    @CurrentUser() user: any,
  ): Promise<DepositDto> {
    return this.depositsService.create(user.user_id, dto);
  }

  @Put(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<DepositDto> {
    return this.depositsService.cancelByUser(id, user.user_id);
  }

  @Put(':id/settlement-preference')
  async updateSettlementPreference(
    @Param('id') id: string,
    @Body('settlement_preference') settlementPreference: string | null,
    @CurrentUser() user: any,
  ): Promise<DepositDto> {
    return this.depositsService.updateSettlementPreference(id, user.user_id, settlementPreference);
  }
}
