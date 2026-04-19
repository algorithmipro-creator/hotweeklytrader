import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TradersService } from './traders.service';
import { TraderDto } from './dto/trader.dto';

@Controller('traders')
@UseGuards(JwtAuthGuard)
export class TradersController {
  constructor(private readonly tradersService: TradersService) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async findAll(): Promise<TraderDto[]> {
    return this.tradersService.findAllActive();
  }

  @Get(':slug')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async findOne(@Param('slug') slug: string): Promise<TraderDto> {
    return this.tradersService.findOneBySlug(slug);
  }
}
