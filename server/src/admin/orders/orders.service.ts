import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PAYMENT_LABEL } from '../../common/settings/settings.types';
import { PrismaService } from '../../prisma/prisma.service';
import { cancelOrderAndRestore } from '../../common/orders/order-lifecycle';
import {
  NotificationsService,
  OrderNotifierService,
} from '../../common/notifications';
import { csvLine } from '../../common/utils/csv';
import { AuditService, writeAudit } from '../../common/audit';
import { AdminFeedService } from '../../common/admin-feed';
import {
  ListOrdersDto,
  OrderFilterDto,
  UpdateOrderNotesDto,
  UpdateShippingInfoDto,
} from './dto/order-admin.dto';
import { recordReceivedPayment } from './order-payments';

// Admins can cancel until delivery (e.g. the courier returned the parcel).
// Delivered orders go through return requests instead.
const ADMIN_CANCELLABLE: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'ON_HOLD',
  'SHIPPED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
];

export const STAGE_STATUSES: Record<string, OrderStatus[]> = {
  pending: ['PENDING'],
  toShip: ['CONFIRMED', 'PROCESSING'],
  inDelivery: ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'],
  delivered: ['DELIVERED'],
  onHold: ['ON_HOLD'],
  ended: ['CANCELLED', 'RETURNED', 'REFUNDED'],
};

const SORTS: Record<string, Prisma.OrderOrderByWithRelationInput> = {
  newest: { placedAt: 'desc' },
  oldest: { placedAt: 'asc' },
  'total-desc': { total: 'desc' },
  'total-asc': { total: 'asc' },
};

export const EXPORT_MAX_ROWS = 20000;
const EXPORT_CHUNK = 500;

@Injectable()
export class AdminOrdersService {
  constructor(
    private prisma: PrismaService,
    private notifier: OrderNotifierService,
    private notifications: NotificationsService,
    private adminFeed: AdminFeedService,
    private audit: AuditService,
  ) {}

  where(q: OrderFilterDto): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {
      ...(q.status
        ? { status: q.status }
        : q.stage
          ? { status: { in: STAGE_STATUSES[q.stage] } }
          : {}),
      ...(q.toVerify
        ? {
            paymentStatus: 'PENDING' as const,
            paymentMethod: { in: ['BKASH', 'NAGAD', 'ROCKET' as const] },
            ...(q.status || q.stage
              ? {}
              : {
                  status: {
                    notIn: ['CANCELLED', 'RETURNED', 'REFUNDED' as const],
                  },
                }),
          }
        : {}),
      ...(q.paymentStatus ? { paymentStatus: q.paymentStatus } : {}),
      ...(q.paymentMethod ? { paymentMethod: q.paymentMethod } : {}),
      ...(q.source ? { source: q.source } : {}),
      ...((q.from || q.to) && {
        placedAt: {
          ...(q.from ? { gte: q.from } : {}),
          ...(q.to ? { lte: q.to } : {}),
        },
      }),
    };
    const search = q.search?.trim();
    if (search) {
      const s = { contains: search, mode: 'insensitive' as const };
      where.OR = [
        { orderNumber: s },
        { trackingNumber: s },
        { bkashTransactionId: s },
        { user: { name: s } },
        { user: { email: s } },
        { user: { phone: { contains: search } } },
        { guestName: s },
        { guestPhone: { contains: search } },
        { guestEmail: s },
        { shippingAddress: { phone: { contains: search } } },
        { shippingAddress: { fullName: s } },
        // every order that contains this product (name, option or SKU)
        { items: { some: { productName: s } } },
        { items: { some: { variantName: s } } },
        { items: { some: { variantSku: s } } },
      ];
    }
    return where;
  }

  /**
   * Numbers for the cards above the orders list. They follow the page's date, source, payment and search filters,
   * but not its status filter, so the cards keep showing the whole picture while you filter by status.
   */
  async stats(q: OrderFilterDto) {
    const where = this.where({
      ...q,
      status: undefined,
      stage: undefined,
      toVerify: undefined,
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [byStatus, todayCount, money, todayMoney, verify] = await Promise.all(
      [
        this.prisma.order.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
        }),
        this.prisma.order.count({
          where: { ...where, placedAt: { gte: today } },
        }),
        this.prisma.order.aggregate({
          where: {
            ...where,
            status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
          },
          _sum: { total: true },
        }),
        this.prisma.order.aggregate({
          where: {
            ...where,
            placedAt: { gte: today },
            status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
          },
          _sum: { total: true },
        }),
        this.prisma.order.count({
          where: {
            ...where,
            paymentStatus: 'PENDING',
            paymentMethod: { in: ['BKASH', 'NAGAD', 'ROCKET'] },
            status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
          },
        }),
      ],
    );
    const n = (...s: string[]) =>
      byStatus
        .filter((r) => s.includes(r.status))
        .reduce((a, r) => a + r._count._all, 0);
    const total = byStatus.reduce((a, r) => a + r._count._all, 0);
    return {
      total,
      today: todayCount,
      pending: n('PENDING'),
      toShip: n('CONFIRMED', 'PROCESSING'),
      inDelivery: n('SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'),
      delivered: n('DELIVERED'),
      onHold: n('ON_HOLD'),
      ended: n('CANCELLED', 'RETURNED', 'REFUNDED'),
      paymentToVerify: verify,
      revenue: Number(money._sum.total ?? 0),
      revenueToday: Number(todayMoney._sum.total ?? 0),
    };
  }

  async findAll(q: ListOrdersDto) {
    const where = this.where(q);
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: true,
          shippingAddress: true,
          _count: { select: { items: true } },
        },
        orderBy: [SORTS[q.sortBy ?? 'newest'], { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      data,
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        shippingAddress: true,
        payments: { include: { refunds: true }, orderBy: { createdAt: 'asc' } },
        refundTransactions: { orderBy: { createdAt: 'asc' } },
        returnRequests: { select: { id: true, status: true, createdAt: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // Streams the filtered orders to `write` in chunks (one CSV row per line item).
  async exportCsv(q: OrderFilterDto, write: (chunk: string) => void) {
    const where = this.where(q);
    write(
      csvLine([
        'orderNumber',
        'placedAt',
        'status',
        'paymentStatus',
        'paymentMethod',
        'source',
        'customer',
        'phone',
        'email',
        'address',
        'district',
        'zone',
        'items',
        'subtotal',
        'discount',
        'shipping',
        'total',
        'paid',
        'due',
        'courier',
        'trackingNumber',
        'coupon',
        'internalNote',
      ]) + '\r\n',
    );
    let written = 0;
    let cursor: string | undefined;
    while (written < EXPORT_MAX_ROWS) {
      const rows = await this.prisma.order.findMany({
        where,
        orderBy: [{ placedAt: 'desc' }, { id: 'asc' }],
        take: Math.min(EXPORT_CHUNK, EXPORT_MAX_ROWS - written),
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          items: {
            select: { productName: true, variantName: true, quantity: true },
          },
          shippingAddress: true,
          user: { select: { name: true, email: true, phone: true } },
        },
      });
      if (!rows.length) break;
      for (const o of rows) {
        const a = o.shippingAddress;
        write(
          csvLine([
            o.orderNumber,
            o.placedAt,
            o.status,
            o.paymentStatus,
            o.paymentMethod,
            o.source,
            a?.fullName ?? o.user?.name ?? o.guestName ?? '',
            a?.phone ?? o.user?.phone ?? o.guestPhone ?? '',
            o.user?.email ?? o.guestEmail ?? '',
            [a?.line1, a?.upazila, a?.city].filter(Boolean).join(', '),
            a?.district ?? '',
            o.shippingZone ?? '',
            o.items
              .map(
                (i) =>
                  `${i.productName}${i.variantName ? ` (${i.variantName})` : ''} x${i.quantity}`,
              )
              .join('; '),
            Number(o.subtotal),
            Number(o.discountAmount),
            Number(o.shippingCost),
            Number(o.total),
            Number(o.paidAmount),
            Number(o.dueAmount),
            o.courierName ?? '',
            o.trackingNumber ?? '',
            o.couponCode ?? '',
            o.internalNote ?? '',
          ]) + '\r\n',
        );
      }
      written += rows.length;
      cursor = rows[rows.length - 1].id;
      if (rows.length < EXPORT_CHUNK) break;
    }
  }

  async updateStatus(
    id: string,
    status: string,
    note?: string,
    adminId?: string,
  ) {
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException(
        `Invalid status. Use one of: ${Object.values(OrderStatus).join(', ')}`,
      );
    }
    const nextStatus = status as OrderStatus;

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.status === nextStatus) {
      throw new BadRequestException(`Order is already ${nextStatus}`);
    }
    // Stock and the coupon were released on cancel, so reopening would
    // sell stock that is no longer reserved. Place a new order instead.
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('A cancelled order cannot be reopened');
    }

    if (nextStatus === 'CANCELLED') {
      const cancelled = await this.prisma.$transaction(async (tx) => {
        const result = await cancelOrderAndRestore(tx, id, {
          allowedFrom: ADMIN_CANCELLABLE,
          note: note ?? 'Cancelled by admin',
          changedBy: 'admin',
        });
        if (!result.cancelled) {
          throw new BadRequestException(
            `A ${result.status} order cannot be cancelled. Use a return request instead.`,
          );
        }
        if (adminId) {
          await writeAudit(tx, {
            adminId,
            action: 'ORDER_STATUS_CHANGED',
            entity: 'Order',
            entityId: id,
            oldValue: { orderNumber: order.orderNumber, status: order.status },
            newValue: {
              orderNumber: order.orderNumber,
              status: 'CANCELLED',
              note,
            },
          });
        }
        return tx.order.findUniqueOrThrow({
          where: { id },
          include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
        });
      });
      void this.resolveFeed(id);
      void this.notifier.orderStatusChanged(id, 'CANCELLED', note);
      return cancelled;
    }

    const timestampField: Partial<
      Record<OrderStatus, keyof Prisma.OrderUpdateInput>
    > = {
      CONFIRMED: 'confirmedAt',
      PROCESSING: 'processingAt',
      SHIPPED: 'shippedAt',
      DELIVERED: 'deliveredAt',
    };

    const updateData: Prisma.OrderUpdateInput = {
      status: nextStatus,
      statusHistory: {
        create: {
          fromStatus: order.status,
          toStatus: nextStatus,
          note: note ?? `Status changed to ${nextStatus}`,
          changedBy: 'admin',
        },
      },
    };

    const tsField = timestampField[nextStatus];
    if (tsField) (updateData as Record<string, unknown>)[tsField] = new Date();
    if (nextStatus === 'DELIVERED') updateData.actualDelivery = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      // Claim the transition so two admins cannot apply it twice.
      const claimed = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status: nextStatus },
      });
      if (claimed.count === 0) {
        throw new BadRequestException(
          'The order was updated at the same time. Refresh and try again.',
        );
      }
      // Cash on Delivery is collected by the courier: delivered = paid.
      if (
        nextStatus === 'DELIVERED' &&
        order.paymentMethod === 'CASH_ON_DELIVERY' &&
        order.paymentStatus === 'PENDING'
      ) {
        const due = Math.max(0, Number(order.total) - Number(order.paidAmount));
        if (due > 0) {
          await recordReceivedPayment(tx, order, {
            amount: due,
            method: 'CASH_ON_DELIVERY',
            note: 'Cash collected on delivery',
          });
        }
      }
      if (adminId) {
        await writeAudit(tx, {
          adminId,
          action: 'ORDER_STATUS_CHANGED',
          entity: 'Order',
          entityId: id,
          oldValue: { orderNumber: order.orderNumber, status: order.status },
          newValue: {
            orderNumber: order.orderNumber,
            status: nextStatus,
            note,
          },
        });
      }
      return tx.order.update({
        where: { id },
        data: updateData,
        include: { statusHistory: { orderBy: { createdAt: 'asc' } } },
      });
    });
    if (order.status === 'PENDING') {
      void this.adminFeed.resolve('NEW_ORDER', id);
    }
    void this.notifier.orderStatusChanged(id, nextStatus, note);
    return updated;
  }

  // Changes many orders; each one is applied (or fails) on its own.
  async bulkStatus(
    ids: string[],
    status: OrderStatus,
    note?: string,
    adminId?: string,
  ) {
    const unique = [...new Set(ids)];
    const results: {
      id: string;
      orderNumber?: string;
      ok: boolean;
      error?: string;
    }[] = [];
    for (const id of unique) {
      try {
        const updated = await this.updateStatus(id, status, note, adminId);
        results.push({ id, orderNumber: updated.orderNumber, ok: true });
      } catch (e) {
        results.push({
          id,
          ok: false,
          error: e instanceof Error ? e.message : 'Failed',
        });
      }
    }
    return {
      status,
      updated: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  async updateShippingInfo(id: string, dto: UpdateShippingInfoDto) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('A cancelled order has no delivery');
    }
    const data: Prisma.OrderUpdateInput = {};
    if (dto.courierName !== undefined)
      data.courierName = dto.courierName || null;
    if (dto.trackingNumber !== undefined)
      data.trackingNumber = dto.trackingNumber || null;
    if (dto.trackingUrl !== undefined)
      data.trackingUrl = dto.trackingUrl || null;
    if (!Object.keys(data).length)
      throw new BadRequestException('Nothing to change');

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...data,
        statusHistory: {
          create: {
            toStatus: order.status,
            fromStatus: order.status,
            note: 'Delivery details updated',
            changedBy: 'admin',
          },
        },
      },
    });

    if (dto.notifyCustomer && order.userId && updated.trackingNumber) {
      void this.notifications
        .notifyInApp(order.userId, {
          type: 'ORDER_UPDATED',
          title: `Tracking details for ${order.orderNumber}`,
          body: `${updated.courierName ? `${updated.courierName}: ` : ''}${updated.trackingNumber}`,
          data: { orderId: id, orderNumber: order.orderNumber },
        })
        .catch(() => undefined);
    }
    return this.findOne(id);
  }

  async updateNotes(id: string, dto: UpdateOrderNotesDto) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    const data: Prisma.OrderUpdateInput = {};
    if (dto.internalNote !== undefined)
      data.internalNote = dto.internalNote || null;
    if (dto.staffNote !== undefined) data.staffNote = dto.staffNote || null;
    if (dto.deliveryNote !== undefined)
      data.deliveryNote = dto.deliveryNote || null;
    if (!Object.keys(data).length)
      throw new BadRequestException('Nothing to change');
    await this.prisma.order.update({ where: { id }, data });
    return this.findOne(id);
  }

  // A cancelled order no longer needs confirming or payment checking.
  private async resolveFeed(orderId: string) {
    await this.adminFeed.resolve('NEW_ORDER', orderId);
    await this.adminFeed.resolve('PAYMENT_PENDING', orderId);
  }

  async verifyPayment(
    id: string,
    paymentStatus: 'PAID' | 'FAILED',
    note?: string,
    adminId?: string,
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.paymentMethod === 'CASH_ON_DELIVERY') {
      throw new BadRequestException(
        'Cash on Delivery orders are settled on delivery, not verified here',
      );
    }

    const methodLabel = PAYMENT_LABEL[order.paymentMethod] ?? 'mobile banking';
    if (!order.bkashTransactionId) {
      throw new BadRequestException(
        `This order has no ${methodLabel} transaction ID submitted`,
      );
    }
    if (order.status === 'CANCELLED') {
      throw new BadRequestException('A cancelled order cannot be paid');
    }
    if (order.paymentStatus === 'PAID' && paymentStatus === 'PAID') {
      throw new BadRequestException('This payment is already verified');
    }
    if (
      order.paymentStatus === 'REFUNDED' ||
      order.paymentStatus === 'PARTIALLY_REFUNDED'
    ) {
      throw new BadRequestException('This order has been refunded');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const base: Prisma.OrderUpdateInput = {
        paymentVerifiedAt: new Date(),
        ...(note ? { staffNote: note } : {}),
      };
      if (paymentStatus === 'PAID') {
        const due = Math.max(0, Number(order.total) - Number(order.paidAmount));
        await tx.order.update({ where: { id }, data: base });
        if (due > 0) {
          await recordReceivedPayment(tx, order, {
            amount: due,
            method: order.paymentMethod,
            transactionId: order.bkashTransactionId,
            note: note ?? `${methodLabel} payment verified`,
          });
        }
        return tx.order.findUniqueOrThrow({ where: { id } });
      }
      await tx.payment.create({
        data: {
          orderId: id,
          method: order.paymentMethod,
          status: 'FAILED',
          amount: order.total,
          transactionId: order.bkashTransactionId,
          referenceId: note ?? `${methodLabel} payment rejected`,
        },
      });
      return tx.order.update({
        where: { id },
        data: { ...base, paymentStatus: 'FAILED' },
      });
    });
    void this.adminFeed.resolve('PAYMENT_PENDING', id);
    if (adminId) {
      await this.audit.recordSafe({
        adminId,
        action: 'PAYMENT_RECORDED',
        entity: 'Order',
        entityId: id,
        oldValue: {
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
        },
        newValue: {
          orderNumber: order.orderNumber,
          paymentStatus,
          transactionId: order.bkashTransactionId,
          note,
        },
      });
    }
    void this.notifier.paymentUpdated(id, paymentStatus, note);
    return updated;
  }
}
