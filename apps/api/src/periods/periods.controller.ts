import { Controller, Get, Param } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { PeriodDto } from './dto/period.dto';

@Controller('periods')
export class PeriodsController {
  constructor(private periodsService: PeriodsService) {}

  @Get()
  async findAll(): Promise<PeriodDto[]> {
    return this.periodsService.findAll('ACTIVE');
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<PeriodDto> {
    return this.periodsService.findOne(id);
  }
}
