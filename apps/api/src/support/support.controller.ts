import {
  Controller, Get, Post, Body, Param, UseGuards,
} from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSupportCaseDto, SupportCaseDto } from './dto/support.dto';

@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Get()
  async findAll(@CurrentUser() user: any): Promise<SupportCaseDto[]> {
    return this.supportService.findByUser(user.user_id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any): Promise<SupportCaseDto> {
    return this.supportService.findOne(id, user.user_id);
  }

  @Post()
  async create(
    @Body() dto: CreateSupportCaseDto,
    @CurrentUser() user: any,
  ): Promise<SupportCaseDto> {
    return this.supportService.create(user.user_id, dto);
  }
}
