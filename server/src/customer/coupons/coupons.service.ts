import { BadRequestException, Injectable } from '@nestjs/common';
import { Coupon, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { round2 } from '../shipping/shipping.service';

type Db = PrismaService | Prisma.TransactionClient;

export interface CouponLine {
  productId: string;
  categoryId: string;
  lineTotal: number;
}

export interface CouponContext {
  // A logged-in customer, or a guest identified by their phone number.
  userId?: string;
  guestPhone?: string;
  lines: CouponLine[];
  subtotal: number;
  shippingCost: number;
  // Re-checking an order that already used the coupon (e.g. after its
  // items were edited): that order's own use must not count against it.
  excludeOrderId?: string;
}

export type CouponResult =
  | {
      valid: true;
      coupon: Coupon;
      code: string;
      description: string | null;
      discountType: Coupon['discountType'];
      // Discount on the products. For FREE_SHIPPING coupons this is 0 and
      // shippingDiscount carries the value instead.
      discountAmount: number;
      shippingDiscount: number;
      eligibleSubtotal: number;
    }
  | { valid: false; code: string; message: string };

// Statuses whose orders no longer count as having "used" a coupon.
const RELEASED_ORDER_STATUSES = ['CANCELLED'] as const;

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  // Validates a coupon against the cart and returns the discount it gives.
  // Never throws for business-rule failures — returns { valid: false } with a
  // customer-facing message so checkout summary can show it inline.
  async evaluate(
    rawCode: string,
    ctx: CouponContext,
    db: Db = this.prisma,
  ): Promise<CouponResult> {
    const code = this.normalizeCode(rawCode);
    const fail = (message: string): CouponResult => ({
      valid: false,
      code,
      message,
    });

    const coupon = await db.coupon.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      include: { products: { select: { id: true } } },
    });

    if (!coupon || !coupon.isActive) return fail('Invalid coupon code');

    const now = new Date();
    if (coupon.validFrom > now) return fail('This coupon is not active yet');
    if (coupon.validTo < now) return fail('This coupon has expired');

    if (coupon.discountType === 'BUY_X_GET_Y') {
      return fail('This coupon cannot be applied online');
    }

    const ownUse = ctx.excludeOrderId
      ? await db.couponUsage.count({
          where: { couponId: coupon.id, orderId: ctx.excludeOrderId },
        })
      : 0;
    if (
      coupon.maxUsageCount !== null &&
      coupon.usageCount - ownUse >= coupon.maxUsageCount
    ) {
      return fail('This coupon has reached its usage limit');
    }

    if (coupon.type === 'PRIVATE' || coupon.applicableUsers) {
      if (!ctx.userId) return fail('Log in to use this coupon');
      const allowedUsers = parseIdList(coupon.applicableUsers);
      if (!allowedUsers.includes(ctx.userId)) {
        return fail('This coupon is not available for your account');
      }
    }

    // Per-customer rules need to know who the customer is. Guests are
    // identified by phone, which they enter at checkout.
    const needsIdentity =
      coupon.maxUsagePerUser !== null || coupon.firstOrderOnly;
    if (needsIdentity && !ctx.userId && !ctx.guestPhone) {
      return fail('Enter your phone number to use this coupon');
    }

    if (coupon.maxUsagePerUser !== null) {
      const used = await db.couponUsage.count({
        where: {
          couponId: coupon.id,
          ...(ctx.userId
            ? { userId: ctx.userId }
            : { guestPhone: ctx.guestPhone }),
          ...(ctx.excludeOrderId
            ? { NOT: { orderId: ctx.excludeOrderId } }
            : {}),
        },
      });
      if (used >= coupon.maxUsagePerUser) {
        return fail('You have already used this coupon');
      }
    }

    if (coupon.firstOrderOnly) {
      const notCancelled = { notIn: [...RELEASED_ORDER_STATUSES] };
      // A guest phone also matches orders placed with that delivery phone,
      // so creating an account or checking out as guest again does not
      // reset "first order".
      const phone = ctx.guestPhone;
      const previousOrders = await db.order.count({
        where: {
          status: notCancelled,
          ...(ctx.excludeOrderId ? { id: { not: ctx.excludeOrderId } } : {}),
          OR: [
            ...(ctx.userId ? [{ userId: ctx.userId }] : []),
            ...(phone
              ? [{ guestPhone: phone }, { shippingAddress: { phone } }]
              : []),
          ],
        },
      });
      if (previousOrders > 0)
        return fail('This coupon is only valid on your first order');
    }

    const minOrder = coupon.minOrderAmount ? Number(coupon.minOrderAmount) : 0;
    if (ctx.subtotal < minOrder) {
      return fail(
        `Add ৳${round2(minOrder - ctx.subtotal)} more to use this coupon (minimum order ৳${minOrder})`,
      );
    }

    const eligibleSubtotal = this.eligibleSubtotal(coupon, ctx.lines);
    if (eligibleSubtotal <= 0) {
      return fail('This coupon does not apply to the products in your cart');
    }

    const value = Number(coupon.discountValue);
    let discountAmount = 0;
    let shippingDiscount = 0;

    switch (coupon.discountType) {
      case 'PERCENTAGE': {
        discountAmount = (eligibleSubtotal * value) / 100;
        if (coupon.maxDiscount !== null) {
          discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
        }
        break;
      }
      case 'FIXED_AMOUNT':
        discountAmount = Math.min(value, eligibleSubtotal);
        break;
      case 'FREE_SHIPPING':
        if (ctx.shippingCost <= 0) {
          return fail('Shipping is already free for this order');
        }
        shippingDiscount = ctx.shippingCost;
        break;
    }

    return {
      valid: true,
      coupon,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountAmount: round2(discountAmount),
      shippingDiscount: round2(shippingDiscount),
      eligibleSubtotal: round2(eligibleSubtotal),
    };
  }

  // Records the coupon against an order inside the order transaction.
  // The conditional increment guards the global usage limit against two
  // orders racing for the last use.
  async redeem(
    tx: Prisma.TransactionClient,
    result: Extract<CouponResult, { valid: true }>,
    customer: { userId?: string; guestPhone?: string },
    orderId: string,
  ) {
    const { coupon } = result;
    const updated = await tx.coupon.updateMany({
      where: {
        id: coupon.id,
        ...(coupon.maxUsageCount !== null
          ? { usageCount: { lt: coupon.maxUsageCount } }
          : {}),
      },
      data: { usageCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    await tx.couponUsage.create({
      data: {
        couponId: coupon.id,
        userId: customer.userId ?? null,
        guestPhone: customer.userId ? null : (customer.guestPhone ?? null),
        orderId,
        discountAmount: result.discountAmount + result.shippingDiscount,
      },
    });
  }

  private eligibleSubtotal(
    coupon: Coupon & { products: { id: string }[] },
    lines: CouponLine[],
  ) {
    if (coupon.appliesToAllProducts) {
      return lines.reduce((sum, l) => sum + l.lineTotal, 0);
    }

    const productIds = new Set([
      ...coupon.products.map((p) => p.id),
      ...parseIdList(coupon.applicableProducts),
    ]);
    const categoryIds = new Set(parseIdList(coupon.applicableCategories));

    return lines
      .filter(
        (l) => productIds.has(l.productId) || categoryIds.has(l.categoryId),
      )
      .reduce((sum, l) => sum + l.lineTotal, 0);
  }
}

// applicableProducts / applicableCategories / applicableUsers are stored as
// JSON arrays of IDs; tolerate a comma-separated string too.
export function parseIdList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    // fall through to comma-separated
  }
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
