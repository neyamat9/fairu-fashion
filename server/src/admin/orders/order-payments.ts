import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';

export const round2 = (n: number) => Math.round(n * 100) / 100;

type Tx = Prisma.TransactionClient;

// Writes a received payment and brings the order's paid / due amounts and
// payment status in line. The order is fully paid once the net received
// amount reaches the total.
export async function recordReceivedPayment(
  tx: Tx,
  order: {
    id: string;
    total: Prisma.Decimal | number;
    paidAmount: Prisma.Decimal | number;
  },
  input: {
    amount: number;
    method: PaymentMethod;
    transactionId?: string | null;
    paidAt?: Date;
    note?: string | null;
  },
) {
  const payment = await tx.payment.create({
    data: {
      orderId: order.id,
      method: input.method,
      status: 'PAID',
      amount: input.amount,
      transactionId: input.transactionId ?? null,
      referenceId: input.note ?? null,
      paidAt: input.paidAt ?? new Date(),
    },
  });
  const paid = round2(Number(order.paidAmount) + input.amount);
  const total = Number(order.total);
  await tx.order.update({
    where: { id: order.id },
    data: {
      paidAmount: paid,
      dueAmount: Math.max(0, round2(total - paid)),
      paymentStatus: paid >= total ? 'PAID' : 'PENDING',
    },
  });
  return payment;
}

// After the total changes (edit), keep the due amount right.
export function dueFor(total: number, paid: number) {
  return Math.max(0, round2(total - paid));
}

export function paymentStatusAfterTotalChange(
  current: PaymentStatus,
  total: number,
  paid: number,
): PaymentStatus {
  if (
    current === 'REFUNDED' ||
    current === 'PARTIALLY_REFUNDED' ||
    current === 'FAILED'
  ) {
    return current;
  }
  return paid > 0 && paid >= total ? 'PAID' : 'PENDING';
}
