import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { ListAdminNotificationsDto } from './admin-notifications.dto';

@Injectable()
export class AdminNotificationsService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
  ) {}

  async list(q: ListAdminNotificationsDto) {
    const where: Prisma.AdminNotificationWhereInput = {
      ...(q.unread === undefined ? {} : { isRead: !q.unread }),
      ...(q.type ? { type: q.type } : {}),
    };
    const [data, total, unread] = await Promise.all([
      this.prisma.adminNotification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.adminNotification.count({ where }),
      this.prisma.adminNotification.count({ where: { isRead: false } }),
    ]);
    return {
      data,
      unreadCount: unread,
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  async unreadCount() {
    return {
      unread: await this.prisma.adminNotification.count({
        where: { isRead: false },
      }),
    };
  }

  // Live numbers for the bell: what needs attention right now. Computed
  // from the data itself, so they can never drift from reality.
  async summary() {
    const [
      pendingOrders,
      pendingBkash,
      openTickets,
      pendingReturns,
      unansweredQuestions,
      newContactMessages,
      stock,
      unread,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({
        where: {
          paymentMethod: { in: ['BKASH', 'NAGAD', 'ROCKET'] },
          paymentStatus: 'PENDING',
          bkashTransactionId: { not: null },
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.returnRequest.count({ where: { status: 'REQUESTED' } }),
      this.prisma.productQuestion.count({ where: { answer: null } }),
      this.prisma.contactMessage.count({ where: { status: 'NEW' } }),
      this.inventory.summary(),
      this.prisma.adminNotification.count({ where: { isRead: false } }),
    ]);
    return {
      unreadNotifications: unread,
      pendingOrders,
      pendingBkashPayments: pendingBkash,
      openTickets,
      pendingReturns,
      unansweredQuestions,
      newContactMessages,
      lowStockItems: stock.lowStock,
      outOfStockItems: stock.outOfStock,
    };
  }

  async markRead(id: string, adminId: string) {
    const found = await this.prisma.adminNotification.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Notification not found');
    await this.prisma.adminNotification.updateMany({
      where: { id, isRead: false },
      data: { isRead: true, readAt: new Date(), readById: adminId },
    });
    return this.unreadCount();
  }

  async markAllRead(adminId: string) {
    const r = await this.prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date(), readById: adminId },
    });
    return { marked: r.count, unread: 0 };
  }

  async remove(id: string) {
    const r = await this.prisma.adminNotification.deleteMany({ where: { id } });
    if (r.count === 0) throw new NotFoundException('Notification not found');
    return { success: true };
  }
}
