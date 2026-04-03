import {
  Controller, Get, Post, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePeriodDto, UpdatePeriodDto, PeriodDto, PeriodStatus } from './dto/period.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/periods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminPeriodsController {
  constructor(private periodsService: PeriodsService) {}

  @Get()
  async findAll(@Query('status') status?: string): Promise<PeriodDto[]> {
    return this.periodsService.findAll(status || 'ALL');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PeriodDto> {
    return this.periodsService.findOne(id);
  }

  @Post()
  async create(
    @Body() dto: CreatePeriodDto,
    @CurrentUser() user: any,
  ): Promise<PeriodDto> {
    return this.periodsService.create(dto, user.user_id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePeriodDto,
  ): Promise<PeriodDto> {
    return this.periodsService.update(id, dto);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: PeriodStatus,
  ): Promise<PeriodDto> {
    return this.periodsService.updateStatus(id, status);
  }
}
