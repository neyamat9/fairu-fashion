import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, Prisma, ReturnStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderNotifierService } from '../../common/notifications';
import { StockService } from '../../common/inventory';
import { writeAudit } from '../../common/audit';

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class AdminReturnsService {
  constructor(
    private prisma: PrismaService,
    private notifier: OrderNotifierService,
    private stock: StockService,
  ) {}

  async findAll(page = 1, limit = 20, status?: string) {
    const where: Prisma.ReturnRequestWhereInput = {};
    if (status) where.status = status as ReturnStatus;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          order: { select: { id: true, orderNumber: true } },
          items: {
            include: {
              orderItem: { select: { productName: true, productSlug: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const req = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        items: { include: { orderItem: true } },
        order: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!req) throw new NotFoundException('Return request not found');
    return req;
  }

  async updateStatus(
    id: string,
    status: ReturnStatus,
    note?: string,
    adminId?: string,
  ) {
    let refund: RefundOutcome | null = null;
    const updated = await this.prisma.$transaction(async (tx) => {
      const req = await tx.returnRequest.findUnique({
        where: { id },
        include: { items: { include: { orderItem: true } }, order: true },
      });
      if (!req) throw new NotFoundException('Return request not found');

      const allowed = ALLOWED_TRANSITIONS[req.status];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          allowed.length
            ? `Cannot move a ${req.status} return to ${status}. Allowed: ${allowed.join(', ')}`
            : `This return is already ${req.status} and cannot be changed`,
        );
      }

      const updateData: Prisma.ReturnRequestUpdateInput = { status };
      if (note !== undefined) updateData.adminNote = note;
      if (status === 'APPROVED') updateData.approvedAt = new Date();

      if (status === 'RECEIVED') {
        updateData.receivedAt = new Date();
        // Put returned items back in stock, except ones that came back damaged.
        for (const item of req.items) {
          if (item.condition === 'Damaged') continue;
          await this.stock.change(tx, {
            productId: item.orderItem.productId,
            variantId: item.orderItem.variantId,
            change: item.quantity,
            reason: 'RETURN',
            reference: `Return for order ${req.order.orderNumber}`,
            lenient: true,
          });
        }
      }

      if (status === 'REFUNDED') {
        updateData.refundedAt = new Date();
        refund = await this.recordReturnRefund(tx, req, adminId);
        await this.updateOrderAfterRefund(tx, req.orderId, req.id);
      }

      return tx.returnRequest.update({
        where: { id },
        data: updateData,
        include: { items: { include: { orderItem: true } } },
      });
    });

    void this.notifier.returnStatusChanged(id, status, note);
    return refund ? { ...updated, refund } : updated;
  }

  // Writes the money side of a refunded return: a refund record against the
  // payment(s) that were received, and the order's paid amount goes down.
  // The refund is capped by what is still refundable, so it can never pay
  // back more than was received (even together with manual refunds).
  private async recordReturnRefund(
    tx: Prisma.TransactionClient,
    req: {
      id: string;
      userId: string;
      reason: string;
      orderId: string;
      order: {
        orderNumber: string;
        paidAmount: Prisma.Decimal;
        paymentMethod: PaymentMethod;
        paymentVerifiedAt: Date | null;
      };
      items: { refundAmount: Prisma.Decimal }[];
    },
    adminId?: string,
  ): Promise<RefundOutcome> {
    const requested = round2(
      req.items.reduce((sum, i) => sum + Number(i.refundAmount), 0),
    );
    if (requested <= 0) {
      return {
        recorded: false,
        amount: 0,
        requested,
        note: 'Nothing to refund',
      };
    }

    let payments = await tx.payment.findMany({
      where: {
        orderId: req.orderId,
        status: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
      },
      include: { refunds: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!payments.length) {
      const paid = Number(req.order.paidAmount);
      if (paid <= 0) {
        return {
          recorded: false,
          amount: 0,
          requested,
          note: 'No payment was received for this order, so there is no money to refund',
        };
      }
      // Orders paid before payments were recorded: write the payment now
      const backfill = await tx.payment.create({
        data: {
          orderId: req.orderId,
          method: req.order.paymentMethod,
          status: 'PAID',
          amount: paid,
          referenceId: 'Recorded when the return was refunded',
          paidAt: req.order.paymentVerifiedAt ?? new Date(),
        },
      });
      payments = [{ ...backfill, refunds: [] }];
    }

    let left = requested;
    let refunded = 0;
    for (const p of payments) {
      const already = p.refunds
        .filter((r) => r.status === 'REFUNDED')
        .reduce((sum, r) => sum + Number(r.amount), 0);
      const take = Math.min(round2(Number(p.amount) - already), left);
      if (take <= 0) continue;
      await tx.refundTransaction.create({
        data: {
          orderId: req.orderId,
          paymentId: p.id,
          userId: req.userId,
          amount: take,
          reason: `Return of order ${req.order.orderNumber}: ${req.reason}`,
          method: 'ORIGINAL_PAYMENT',
          status: 'REFUNDED',
          processedBy: adminId ?? null,
          processedAt: new Date(),
          returnRequestId: req.id,
        },
      });
      await tx.payment.update({
        where: { id: p.id },
        data: {
          status:
            take + already >= Number(p.amount)
              ? 'REFUNDED'
              : 'PARTIALLY_REFUNDED',
        },
      });
      left = round2(left - take);
      refunded = round2(refunded + take);
      if (left <= 0) break;
    }
    if (refunded > 0) {
      await tx.order.update({
        where: { id: req.orderId },
        data: {
          paidAmount: Math.max(
            0,
            round2(Number(req.order.paidAmount) - refunded),
          ),
        },
      });
      if (adminId) {
        await writeAudit(tx, {
          adminId,
          action: 'REFUND_RECORDED',
          entity: 'Order',
          entityId: req.orderId,
          oldValue: {
            orderNumber: req.order.orderNumber,
            paid: Number(req.order.paidAmount),
          },
          newValue: {
            orderNumber: req.order.orderNumber,
            refunded,
            method: 'ORIGINAL_PAYMENT',
            reason: `Return: ${req.reason}`,
          },
        });
      }
    }
    return {
      recorded: refunded > 0,
      amount: refunded,
      requested,
      ...(left > 0
        ? {
            note: `${left} could not be recorded: it is more than was received on this order`,
          }
        : {}),
    };
  }

  // Marks the order fully refunded only when every unit has been refunded;
  // otherwise it is a partial refund and the order keeps its status.
  private async updateOrderAfterRefund(
    tx: Prisma.TransactionClient,
    orderId: string,
    refundingRequestId: string,
  ) {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    const refunded = await tx.returnItem.aggregate({
      where: {
        returnRequest: {
          orderId,
          OR: [{ status: 'REFUNDED' }, { id: refundingRequestId }],
        },
      },
      _sum: { quantity: true },
    });

    const orderedUnits = order.items.reduce((sum, i) => sum + i.quantity, 0);
    const fullyRefunded = (refunded._sum.quantity ?? 0) >= orderedUnits;

    await tx.order.update({
      where: { id: orderId },
      data: fullyRefunded
        ? {
            status: 'REFUNDED',
            paymentStatus: 'REFUNDED',
            statusHistory: {
              create: {
                fromStatus: order.status,
                toStatus: 'REFUNDED',
                note: 'All items returned and refunded',
                changedBy: 'admin',
              },
            },
          }
        : { paymentStatus: 'PARTIALLY_REFUNDED' },
    });
  }
}

const ALLOWED_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['PICKED_UP', 'RECEIVED', 'REJECTED'],
  PICKED_UP: ['RECEIVED'],
  RECEIVED: ['REFUNDED', 'REPLACED'],
  REJECTED: [],
  REFUNDED: [],
  REPLACED: [],
};

export interface RefundOutcome {
  recorded: boolean;
  amount: number;
  requested: number;
  note?: string;
}
