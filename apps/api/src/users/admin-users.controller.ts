import {
  Controller, Get, Param, Query, UseGuards, Patch, Body,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

class AdminUpdateUserDto {
  status?: string;
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminUsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const users = await (this.usersService as any).prisma.user.findMany({
      where: status ? { status } : {},
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit, 10) : 50,
      skip: offset ? parseInt(offset, 10) : 0,
      select: {
        user_id: true,
        telegram_id: true,
        username: true,
        display_name: true,
        status: true,
        created_at: true,
        last_login_at: true,
      },
    });

    return users.map((u: any) => ({
      ...u,
      telegram_id: u.telegram_id.toString(),
      created_at: u.created_at.toISOString(),
      last_login_at: u.last_login_at?.toISOString() || null,
    }));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return (this.usersService as any).prisma.user.update({
      where: { user_id: id },
      data: { status: dto.status },
    });
  }
}
