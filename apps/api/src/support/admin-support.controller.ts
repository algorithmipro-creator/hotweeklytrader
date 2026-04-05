import {
  Controller, Get, Put, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { UpdateSupportCaseDto, SupportCaseDto } from './dto/support.dto';

@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminSupportController {
  constructor(private supportService: SupportService) {}

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('assigned_to') assignedTo?: string,
    @Query('priority') priority?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.supportService.findAll({
      status,
      assigned_to: assignedTo,
      priority,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupportCaseDto,
  ): Promise<SupportCaseDto> {
    return this.supportService.update(id, dto);
  }
}
