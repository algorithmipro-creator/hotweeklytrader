import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BindWalletDto, WalletDto } from './dto/wallet.dto';

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Get()
  async findAll(@CurrentUser() user: any): Promise<WalletDto[]> {
    return this.walletsService.findByUser(user.user_id);
  }

  @Post()
  async bind(
    @Body() dto: BindWalletDto,
    @CurrentUser() user: any,
  ): Promise<WalletDto> {
    return this.walletsService.bind(user.user_id, dto);
  }

  @Delete(':id')
  async unbind(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<void> {
    return this.walletsService.unbind(user.user_id, id);
  }
}
