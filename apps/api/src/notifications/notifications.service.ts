import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendNotificationDto, NotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async findByUser(userId: string, limit = 50, offset = 0): Promise<NotificationDto[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return notifications.map(this.serialize);
  }

  async send(dto: SendNotificationDto): Promise<NotificationDto> {
    const notification = await this.prisma.notification.create({
      data: {
        user_id: dto.user_id,
        type: dto.type as any,
        channel: (dto.channel || 'TELEGRAM') as any,
        title: dto.title,
        body: dto.body,
        delivery_status: 'PENDING' as any,
        related_entity_type: dto.related_entity_type || null,
        related_entity_id: dto.related_entity_id || null,
      },
    });

    // In production, dispatch to Telegram bot or email service
    await this.markSent(notification.notification_id);

    return this.serialize(notification);
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationDto> {
    const notification = await this.prisma.notification.update({
      where: { notification_id: notificationId, user_id: userId },
      data: { delivery_status: 'READ', read_at: new Date() },
    });

    return this.serialize(notification);
  }

  async markSent(notificationId: string): Promise<void> {
    await this.prisma.notification.update({
      where: { notification_id: notificationId },
      data: { delivery_status: 'SENT', sent_at: new Date() },
    });
  }

  async markFailed(notificationId: string, reason: string): Promise<void> {
    await this.prisma.notification.update({
      where: { notification_id: notificationId },
      data: { delivery_status: 'FAILED' },
    });
    this.logger.error(`Notification ${notificationId} failed: ${reason}`);
  }

  // Template helpers for common notifications
  async notifyDepositRouteCreated(userId: string, depositId: string, network: string, route: string) {
    return this.send({
      user_id: userId,
      type: 'DEPOSIT_ROUTE_CREATED',
      title: 'Deposit Route Created',
      body: `Your ${network} deposit route is ready: ${route.slice(0, 12)}...`,
      related_entity_type: 'Deposit',
      related_entity_id: depositId,
    });
  }

  async notifyDepositConfirmed(userId: string, depositId: string, amount: string, asset: string) {
    return this.send({
      user_id: userId,
      type: 'TRANSFER_CONFIRMED',
      title: 'Deposit Confirmed',
      body: `Your deposit of ${amount} ${asset} has been confirmed and activated.`,
      related_entity_type: 'Deposit',
      related_entity_id: depositId,
    });
  }

  async notifyReportReady(userId: string, depositId: string, netResult: string) {
    return this.send({
      user_id: userId,
      type: 'REPORT_READY',
      title: 'Trading Report Ready',
      body: `Your trading report is ready. Net result: ${netResult}.`,
      related_entity_type: 'ProfitLossReport',
      related_entity_id: depositId,
    });
  }

  async notifyPayoutSent(userId: string, depositId: string, amount: string, asset: string, txHash: string) {
    return this.send({
      user_id: userId,
      type: 'PAYOUT_SENT',
      title: 'Payout Sent',
      body: `Your payout of ${amount} ${asset} has been sent. TX: ${txHash.slice(0, 10)}...`,
      related_entity_type: 'Payout',
      related_entity_id: depositId,
    });
  }

  async notifyPayoutConfirmed(userId: string, depositId: string, amount: string, asset: string) {
    return this.send({
      user_id: userId,
      type: 'PAYOUT_CONFIRMED',
      title: 'Payout Confirmed',
      body: `Your payout of ${amount} ${asset} has been confirmed on the blockchain.`,
      related_entity_type: 'Payout',
      related_entity_id: depositId,
    });
  }

  private serialize(notification: any): NotificationDto {
    return {
      notification_id: notification.notification_id,
      user_id: notification.user_id,
      type: notification.type,
      channel: notification.channel,
      title: notification.title,
      body: notification.body,
      delivery_status: notification.delivery_status,
      sent_at: notification.sent_at?.toISOString() || null,
      read_at: notification.read_at?.toISOString() || null,
      related_entity_type: notification.related_entity_type,
      related_entity_id: notification.related_entity_id,
      created_at: notification.created_at.toISOString(),
    };
  }
}
