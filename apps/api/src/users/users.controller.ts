import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReferralProfileDto, ReferralTeamDto, UpdateProfileDto, UserProfileDto } from './dto/user.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async getProfile(@CurrentUser() user: any): Promise<UserProfileDto> {
    return this.usersService.findOne(user.user_id);
  }

  @Get('referral')
  async getReferralProfile(@CurrentUser() user: any): Promise<ReferralProfileDto> {
    return this.usersService.findReferralProfile(user.user_id);
  }

  @Get('team')
  async getReferralTeam(@CurrentUser() user: any): Promise<ReferralTeamDto> {
    return this.usersService.findTeam(user.user_id);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(user.user_id, dto);
  }
}
