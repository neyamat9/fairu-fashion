import { ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { StockService } from '../inventory/stock.service';

// StockService keeps no state, so a plain instance is fine here.
const stockService = new StockService();

type Tx = Prisma.TransactionClient;

// Bangladesh is UTC+6 with no DST; order numbers follow the local calendar day.
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

function bdDate(now: Date) {
  return new Date(now.getTime() + BD_OFFSET_MS)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
}

// Atomically increments a named counter and returns the new value.
// One INSERT ... ON CONFLICT DO UPDATE, which holds a row lock until the
// surrounding transaction ends, so concurrent callers never get the same
// value. If the transaction rolls back, the increment rolls back with it.
async function nextCounterValue(tx: Tx, key: string): Promise<number> {
  const [{ value }] = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO "OrderCounter" ("date", "value") VALUES (${key}, 1)
    ON CONFLICT ("date") DO UPDATE SET "value" = "OrderCounter"."value" + 1
    RETURNING "value"`;
  return value;
}

// Returns the next support ticket number for today, e.g. "TKT-20260512-0001".
export async function nextTicketNumber(tx: Tx, now = new Date()) {
  const date = bdDate(now);
  const value = await nextCounterValue(tx, `T${date}`);
  return `TKT-${date}-${String(value).padStart(4, '0')}`;
}

// Returns the next order number for today, e.g. "RZ-20260512-0001".
// The counter row is incremented with a single INSERT ... ON CONFLICT DO
// UPDATE, which takes a row lock until the surrounding transaction ends, so
// two concurrent orders can never read the same value. If the order
// transaction rolls back, the increment rolls back with it.
export async function nextOrderNumber(tx: Tx, now = new Date()) {
  const date = bdDate(now);
  const value = await nextCounterValue(tx, date);
  return `RZ-${date}-${String(value).padStart(4, '0')}`;
}

// Moves an order to CANCELLED and undoes what placing it did: puts the stock
// back, gives the coupon use back, and corrects the customer's order totals.
// Used by both customer and admin cancellation so they always behave the same.
//
// The status change is a conditional update on the status we read, so if two
// requests cancel the same order at once, only one of them restores stock.
export async function cancelOrderAndRestore(
  tx: Tx,
  orderId: string,
  opts: {
    allowedFrom: OrderStatus[];
    note: string;
    changedBy: 'user' | 'admin';
  },
) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true },
  });

  if (!opts.allowedFrom.includes(order.status)) {
    return { cancelled: false as const, status: order.status };
  }

  const claimed = await tx.order.updateMany({
    where: { id: orderId, status: order.status },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new ConflictException(
      'The order was updated at the same time. Please refresh and try again.',
    );
  }

  await tx.orderStatusHistory.create({
    data: {
      orderId,
      fromStatus: order.status,
      toStatus: 'CANCELLED',
      note: opts.note,
      changedBy: opts.changedBy,
    },
  });

  for (const item of order.items) {
    await tx.product.update({
      where: { id: item.productId },
      data: {
        soldCount: { decrement: item.quantity },
        totalSales: { decrement: item.quantity },
      },
    });
    // Back to the variant it was taken from (or the product itself)
    await stockService.change(tx, {
      productId: item.productId,
      variantId: item.variantId,
      change: item.quantity,
      reason: 'RETURN',
      reference: `Order cancelled: ${order.orderNumber}`,
      lenient: true,
    });
  }

  // Give the coupon use back so it can be used again.
  const usages = await tx.couponUsage.findMany({ where: { orderId } });
  for (const usage of usages) {
    await tx.coupon.updateMany({
      where: { id: usage.couponId, usageCount: { gt: 0 } },
      data: { usageCount: { decrement: 1 } },
    });
  }
  await tx.couponUsage.deleteMany({ where: { orderId } });

  if (order.userId) {
    await tx.user.update({
      where: { id: order.userId },
      data: {
        totalOrders: { decrement: 1 },
        totalSpent: { decrement: order.total },
      },
    });
  }

  return { cancelled: true as const, status: order.status };
}
