import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// Notification types a customer can switch on/off per channel.
export const CUSTOMER_NOTIFICATION_TYPES: NotificationType[] = [
  'ORDER_PLACED',
  'ORDER_CONFIRMED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'ORDER_UPDATED',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'RETURN_UPDATED',
  'TICKET_UPDATED',
];

export interface NewNotification {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Channel preference for a user and type. No stored row = enabled.
  async isEnabled(
    userId: string,
    type: NotificationType,
    channel: 'email' | 'inApp',
  ): Promise<boolean> {
    const pref = await this.prisma.notificationSetting.findUnique({
      where: { userId_type: { userId, type } },
    });
    return pref ? pref[channel] : true;
  }

  // Creates an in-app notification unless the user turned that type off.
  async notifyInApp(userId: string, n: NewNotification) {
    if (!(await this.isEnabled(userId, n.type, 'inApp'))) return null;
    return this.prisma.notification.create({
      data: {
        userId,
        type: n.type,
        title: n.title.slice(0, 200),
        body: n.body,
        data: n.data ? JSON.stringify(n.data) : null,
        channel: 'IN_APP',
      },
    });
  }

  async list(
    userId: string,
    opts: { page: number; limit: number; unreadOnly?: boolean },
  ) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(opts.unreadOnly ? { isRead: false } : {}),
    };
    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.notification.count({ where }),
      this.unreadCount(userId),
    ]);

    return {
      data: rows.map((r) => ({ ...r, data: parseJson(r.data) })),
      unreadCount,
      meta: {
        total,
        page: opts.page,
        limit: opts.limit,
        totalPages: Math.ceil(total / opts.limit),
      },
    };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(userId: string, id: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
    if (updated.count === 0)
      throw new NotFoundException('Notification not found');
    return { success: true, unreadCount: await this.unreadCount(userId) };
  }

  async markAllRead(userId: string) {
    const updated = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true, updated: updated.count, unreadCount: 0 };
  }

  async remove(userId: string, id: string) {
    const deleted = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    if (deleted.count === 0)
      throw new NotFoundException('Notification not found');
    return { success: true };
  }

  async getPreferences(userId: string) {
    const rows = await this.prisma.notificationSetting.findMany({
      where: { userId },
    });
    const byType = new Map(rows.map((r) => [r.type, r]));
    return CUSTOMER_NOTIFICATION_TYPES.map((type) => ({
      type,
      email: byType.get(type)?.email ?? true,
      inApp: byType.get(type)?.inApp ?? true,
    }));
  }

  async updatePreferences(
    userId: string,
    prefs: { type: NotificationType; email?: boolean; inApp?: boolean }[],
  ) {
    await this.prisma.$transaction(
      prefs.map((p) =>
        this.prisma.notificationSetting.upsert({
          where: { userId_type: { userId, type: p.type } },
          create: {
            userId,
            type: p.type,
            email: p.email ?? true,
            inApp: p.inApp ?? true,
          },
          update: {
            ...(p.email !== undefined ? { email: p.email } : {}),
            ...(p.inApp !== undefined ? { inApp: p.inApp } : {}),
          },
        }),
      ),
    );
    return this.getPreferences(userId);
  }
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
