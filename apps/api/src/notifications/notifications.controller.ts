import {
  Controller, Get, Post, Body, Param, Query, Put, UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SendNotificationDto, NotificationDto } from './dto/notification.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<NotificationDto[]> {
    return this.notificationsService.findByUser(
      user.user_id,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<NotificationDto> {
    return this.notificationsService.markAsRead(id, user.user_id);
  }
}
