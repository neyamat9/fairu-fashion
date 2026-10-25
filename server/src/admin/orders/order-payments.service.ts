import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordPaymentDto, RecordRefundDto } from './dto/order-admin.dto';
import { recordReceivedPayment, round2 } from './order-payments';
import { writeAudit } from '../../common/audit';

@Injectable()
export class OrderPaymentsService {
  constructor(private prisma: PrismaService) {}

  async list(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { include: { refunds: true }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');

    const received = order.payments
      .filter(
        (p) =>
          p.status === 'PAID' ||
          p.status === 'PARTIALLY_REFUNDED' ||
          p.status === 'REFUNDED',
      )
      .reduce((s, p) => s + Number(p.amount), 0);
    const refunded = order.payments
      .flatMap((p) => p.refunds)
      .filter((r) => r.status === 'REFUNDED')
      .reduce((s, r) => s + Number(r.amount), 0);
    return {
      orderNumber: order.orderNumber,
      total: Number(order.total),
      paymentStatus: order.paymentStatus,
      received: round2(received),
      refunded: round2(refunded),
      netPaid: Number(order.paidAmount),
      due: Number(order.dueAmount),
      payments: order.payments,
    };
  }

  // Money received outside the website (cash at the shop, bKash to the
  // merchant number, a deposit on a phone order...).
  async record(orderId: string, dto: RecordPaymentDto, adminId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === 'CANCELLED') {
        throw new BadRequestException(
          'A cancelled order cannot receive payments',
        );
      }
      if (
        order.paymentStatus === 'REFUNDED' ||
        order.paymentStatus === 'PARTIALLY_REFUNDED'
      ) {
        throw new BadRequestException(
          'This order has refunds: record a new order instead',
        );
      }
      const due = round2(Number(order.total) - Number(order.paidAmount));
      if (due <= 0)
        throw new BadRequestException('This order is already fully paid');
      if (dto.amount > due) {
        throw new BadRequestException(
          `The amount is more than what is due (${due})`,
        );
      }
      if (dto.transactionId) {
        const dup = await tx.payment.findFirst({
          where: {
            transactionId: dto.transactionId,
            status: { in: ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'] },
          },
          select: { id: true },
        });
        if (dup)
          throw new ConflictException(
            'This transaction id has already been recorded',
          );
      }
      await recordReceivedPayment(tx, order, {
        amount: dto.amount,
        method: dto.method,
        transactionId: dto.transactionId,
        paidAt: dto.paidAt,
        note: dto.note,
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          note: `Payment of ${dto.amount} recorded (${dto.method})`,
          changedBy: 'admin',
        },
      });
      await writeAudit(tx, {
        adminId,
        action: 'PAYMENT_RECORDED',
        entity: 'Order',
        entityId: orderId,
        oldValue: {
          orderNumber: order.orderNumber,
          paid: Number(order.paidAmount),
        },
        newValue: {
          orderNumber: order.orderNumber,
          paid: round2(Number(order.paidAmount) + dto.amount),
          amount: dto.amount,
          method: dto.method,
          transactionId: dto.transactionId ?? null,
        },
      });
    });
    return this.list(orderId);
  }

  // Records money given back to the customer. The actual transfer (bKash,
  // bank) is done by hand; this keeps the books and the order in step.
  async refund(orderId: string, dto: RecordRefundDto, adminId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          payments: {
            include: { refunds: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      if (!order) throw new NotFoundException('Order not found');

      const refundable = (p: (typeof order.payments)[number]) =>
        round2(
          Number(p.amount) -
            p.refunds
              .filter((r) => r.status === 'REFUNDED')
              .reduce((s, r) => s + Number(r.amount), 0),
        );
      const candidates = order.payments.filter(
        (p) => p.status === 'PAID' || p.status === 'PARTIALLY_REFUNDED',
      );
      const payment = dto.paymentId
        ? order.payments.find((p) => p.id === dto.paymentId)
        : (candidates.find((p) => refundable(p) >= dto.amount) ??
          candidates[0]);
      if (!payment)
        throw new BadRequestException('There is no received payment to refund');
      if (
        payment.status !== 'PAID' &&
        payment.status !== 'PARTIALLY_REFUNDED'
      ) {
        throw new BadRequestException(
          'That payment was not received, so it cannot be refunded',
        );
      }
      const room = refundable(payment);
      if (dto.amount > room) {
        throw new BadRequestException(
          `At most ${room} can still be refunded on this payment`,
        );
      }

      await tx.refundTransaction.create({
        data: {
          orderId,
          paymentId: payment.id,
          userId: order.userId,
          amount: dto.amount,
          reason: dto.reason,
          method: dto.method,
          status: 'REFUNDED',
          processedBy: adminId,
          processedAt: new Date(),
        },
      });
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: dto.amount >= room ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });

      const gross = order.payments
        .filter((p) => p.status !== 'FAILED' && p.status !== 'PENDING')
        .reduce((s, p) => s + Number(p.amount), 0);
      const refundedBefore = order.payments
        .flatMap((p) => p.refunds)
        .filter((r) => r.status === 'REFUNDED')
        .reduce((s, r) => s + Number(r.amount), 0);
      const refundedNow = round2(refundedBefore + dto.amount);

      await tx.order.update({
        where: { id: orderId },
        data: {
          paidAmount: Math.max(
            0,
            round2(Number(order.paidAmount) - dto.amount),
          ),
          paymentStatus:
            refundedNow >= gross ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: order.status,
          note: `Refund of ${dto.amount} recorded (${dto.method}): ${dto.reason}`,
          changedBy: 'admin',
        },
      });
      await writeAudit(tx, {
        adminId,
        action: 'REFUND_RECORDED',
        entity: 'Order',
        entityId: orderId,
        oldValue: {
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          paid: Number(order.paidAmount),
        },
        newValue: {
          orderNumber: order.orderNumber,
          refunded: dto.amount,
          method: dto.method,
          reason: dto.reason,
        },
      });
    });
    return this.list(orderId);
  }
}
