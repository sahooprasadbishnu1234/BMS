import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserNotifications(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markAsRead(id: string, user: AuthenticatedUser) {
    return this.prisma.notification.updateMany({
      where: { id, userId: user.userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(user: AuthenticatedUser) {
    return this.prisma.notification.updateMany({
      where: { userId: user.userId, isRead: false },
      data: { isRead: true },
    });
  }
}
