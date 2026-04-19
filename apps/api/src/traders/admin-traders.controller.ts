import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { TraderDto, CreateTraderDto, UpdateTraderDto, TraderMainAddressDto, UpsertTraderMainAddressDto } from './dto/trader.dto';
import { TradersService } from './traders.service';

@Controller('admin/traders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminTradersController {
  constructor(private readonly tradersService: TradersService) {}

  @Get()
  async findAll(): Promise<TraderDto[]> {
    return this.tradersService.findAllForAdmin();
  }

  @Get(':id')
  async findOne(@Param('id') traderId: string): Promise<TraderDto> {
    return this.tradersService.findOneById(traderId);
  }

  @Post()
  async create(@Body() dto: CreateTraderDto): Promise<TraderDto> {
    return this.tradersService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') traderId: string,
    @Body() dto: UpdateTraderDto,
  ): Promise<TraderDto> {
    return this.tradersService.update(traderId, dto);
  }

  @Post(':id/main-addresses')
  async upsertMainAddress(
    @Param('id') traderId: string,
    @Body() dto: UpsertTraderMainAddressDto,
  ): Promise<TraderMainAddressDto> {
    return this.tradersService.upsertMainAddress(traderId, dto);
  }
}
