import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationsService } from '../../common/locations';
import { InsufficientStockError, StockService } from '../../common/inventory';
import { nextOrderNumber } from '../../common/orders/order-lifecycle';
import { OrderNotifierService } from '../../common/notifications';
import { normalizeBdPhone } from '../../common/utils/phone';
import { writeAudit } from '../../common/audit';
import { CouponsService } from '../../customer/coupons/coupons.service';
import { ShippingService } from '../../customer/shipping/shipping.service';
import {
  CreateOrderDto,
  OrderLineDto,
  UpdateOrderAddressDto,
  UpdateOrderItemsDto,
} from './dto/order-admin.dto';
import { AdminOrdersService } from './orders.service';
import {
  dueFor,
  paymentStatusAfterTotalChange,
  recordReceivedPayment,
  round2,
} from './order-payments';

type Tx = Prisma.TransactionClient;

// Orders can be changed until they are packed and handed over.
const EDITABLE = ['PENDING', 'CONFIRMED', 'PROCESSING', 'ON_HOLD'];

const productForLine = {
  id: true,
  name: true,
  slug: true,
  status: true,
  sellingPrice: true,
  categoryId: true,
  freeShipping: true,
  images: { where: { isMain: true }, take: 1, select: { url: true } },
  variants: { select: { id: true, name: true, sku: true, price: true } },
} satisfies Prisma.ProductSelect;

type LineProduct = Prisma.ProductGetPayload<{ select: typeof productForLine }>;

@Injectable()
export class OrderEditService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
    private locations: LocationsService,
    private shipping: ShippingService,
    private coupons: CouponsService,
    private notifier: OrderNotifierService,
    private orders: AdminOrdersService,
  ) {}

  // ---------- delivery address ----------

  async updateAddress(id: string, dto: UpdateOrderAddressDto, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        shippingAddress: true,
        items: { select: { productId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    this.assertEditable(order.status);

    const phone = normalizeBdPhone(dto.phone);
    const area = this.locations.resolve({
      division: dto.division,
      district: dto.district,
      upazila: dto.upazila,
    });
    const city =
      dto.city?.trim() || area.district || order.shippingAddress?.city;
    if (!city)
      throw new BadRequestException('Choose a district (or enter a city)');

    await this.prisma.$transaction(async (tx) => {
      const addr = {
        fullName: dto.fullName,
        phone,
        line1: dto.address,
        city,
        state: area.division,
        division: area.division,
        district: area.district,
        upazila: area.upazila,
        postalCode: dto.postalCode ?? order.shippingAddress?.postalCode ?? '',
      };
      if (order.shippingAddressId) {
        await tx.address.update({
          where: { id: order.shippingAddressId },
          data: addr,
        });
      } else {
        const created = await tx.address.create({
          data: {
            ...addr,
            country: 'Bangladesh',
            userId: order.userId,
            label: 'Shipping',
          },
        });
        await tx.order.update({
          where: { id },
          data: { shippingAddressId: created.id },
        });
      }
      if (!order.userId) {
        await tx.order.update({
          where: { id },
          data: { guestName: dto.fullName, guestPhone: phone },
        });
      }

      let note = 'Delivery address changed by admin';
      if (dto.recalculateShipping) {
        const products = await tx.product.findMany({
          where: { id: { in: order.items.map((i) => i.productId) } },
          select: { freeShipping: true },
        });
        const quote = await this.shipping.quote(Number(order.subtotal), {
          city: area.district ?? city,
          allItemsFreeShipping:
            products.length > 0 && products.every((p) => p.freeShipping),
        });
        const shippingCost = quote.cost;
        if (
          shippingCost !== Number(order.shippingCost) ||
          quote.zone !== order.shippingZone
        ) {
          await this.applyTotals(tx, order, {
            subtotal: Number(order.subtotal),
            discount: Number(order.discountAmount),
            shippingCost,
            extra: { shippingZone: quote.zone },
          });
          note += `; shipping ${Number(order.shippingCost)} → ${shippingCost} (${quote.zoneLabel})`;
        }
      }
      const a = order.shippingAddress;
      await writeAudit(tx, {
        adminId,
        action: 'ORDER_EDITED',
        entity: 'Order',
        entityId: id,
        oldValue: {
          orderNumber: order.orderNumber,
          address: a && {
            name: a.fullName,
            phone: a.phone,
            line1: a.line1,
            district: a.district,
            upazila: a.upazila,
          },
          shippingCost: Number(order.shippingCost),
        },
        newValue: {
          orderNumber: order.orderNumber,
          address: {
            name: dto.fullName,
            phone,
            line1: dto.address,
            district: area.district,
            upazila: area.upazila,
          },
          note,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: order.status,
          note,
          changedBy: 'admin',
        },
      });
    });
    return this.orders.findOne(id);
  }

  // ---------- order lines ----------

  async updateItems(id: string, dto: UpdateOrderItemsDto, adminId: string) {
    const warnings: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          items: true,
          shippingAddress: {
            select: { district: true, city: true, phone: true },
          },
          _count: { select: { returnRequests: true } },
        },
      });
      if (!order) throw new NotFoundException('Order not found');
      this.assertEditable(order.status);
      if (order._count.returnRequests > 0) {
        throw new BadRequestException(
          'This order has return requests and can no longer be edited',
        );
      }
      if (
        order.paymentStatus === 'REFUNDED' ||
        order.paymentStatus === 'PARTIALLY_REFUNDED'
      ) {
        throw new BadRequestException(
          'This order has refunds and can no longer be edited',
        );
      }

      // ---- work out the wanted lines ----
      const keep = new Map<string, OrderLineDto>();
      const added: OrderLineDto[] = [];
      for (const line of dto.items) {
        if (line.itemId) {
          if (!order.items.some((i) => i.id === line.itemId)) {
            throw new BadRequestException(
              'A line does not belong to this order',
            );
          }
          if (keep.has(line.itemId))
            throw new BadRequestException('A line is listed twice');
          keep.set(line.itemId, line);
        } else if (line.productId) {
          added.push(line);
        } else {
          throw new BadRequestException(
            'Each line needs an itemId (existing) or a productId (new)',
          );
        }
      }
      const removed = order.items.filter((i) => !keep.has(i.id));

      const products = await this.loadProducts(
        tx,
        added.map((l) => l.productId!),
      );
      const newRows = added.map((l) => this.buildLine(l, products));

      // the same item must not appear on two lines
      const seen = new Set<string>();
      for (const i of order.items.filter((x) => keep.has(x.id))) {
        seen.add(`${i.productId}:${i.variantId ?? ''}`);
      }
      for (const r of newRows) {
        const key = `${r.productId}:${r.variantId ?? ''}`;
        if (seen.has(key)) {
          throw new BadRequestException(
            `"${r.productName}" is already in the order: change its quantity instead of adding it again`,
          );
        }
        seen.add(key);
      }

      // ---- stock + counters ----
      const adjust = async (
        productId: string,
        variantId: string | null,
        delta: number,
        name: string,
      ) => {
        if (delta === 0) return;
        try {
          await this.stock.change(tx, {
            productId,
            variantId,
            change: -delta,
            reason: delta > 0 ? 'SALE' : 'RETURN',
            reference: `Order edited: ${order.orderNumber}`,
            lenient: delta < 0,
          });
        } catch (e) {
          if (e instanceof InsufficientStockError) {
            throw new BadRequestException(
              `"${name}": only ${e.available} in stock`,
            );
          }
          throw e;
        }
        await tx.product.update({
          where: { id: productId },
          data: {
            soldCount: { increment: delta },
            totalSales: { increment: delta },
          },
        });
      };

      for (const item of order.items) {
        const line = keep.get(item.id);
        await adjust(
          item.productId,
          item.variantId,
          (line?.quantity ?? 0) - item.quantity,
          item.productName,
        );
      }
      for (const r of newRows) {
        await adjust(r.productId, r.variantId, r.quantity, r.productName);
      }

      // ---- write lines ----
      for (const item of removed)
        await tx.orderItem.delete({ where: { id: item.id } });
      for (const item of order.items) {
        const line = keep.get(item.id);
        if (!line) continue;
        const price = line.price ?? Number(item.price);
        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            quantity: line.quantity,
            price,
            total: round2(price * line.quantity),
          },
        });
      }
      for (const r of newRows) {
        await tx.orderItem.create({ data: { ...r, orderId: id } });
      }

      // ---- totals ----
      const lines = await tx.orderItem.findMany({ where: { orderId: id } });
      const subtotal = round2(lines.reduce((s, l) => s + Number(l.total), 0));
      let discount = dto.discountAmount ?? Number(order.discountAmount);
      let couponRemoved = false;
      // The order used a coupon and the admin did not set the discount by
      // hand: work it out again for the new items, with the same rules the
      // customer had at checkout.
      if (dto.discountAmount === undefined && order.couponCode) {
        const coupon = await tx.coupon.findFirst({
          where: { code: { equals: order.couponCode, mode: 'insensitive' } },
        });
        if (coupon?.discountType === 'FREE_SHIPPING') {
          // nothing depends on the items: the shipping stays free
        } else if (subtotal !== Number(order.subtotal)) {
          const prods = await tx.product.findMany({
            where: { id: { in: lines.map((l) => l.productId) } },
            select: { id: true, categoryId: true },
          });
          const cat = new Map(prods.map((p) => [p.id, p.categoryId]));
          const result = await this.coupons.evaluate(
            order.couponCode,
            {
              userId: order.userId ?? undefined,
              guestPhone: order.userId
                ? undefined
                : (order.guestPhone ??
                  order.shippingAddress?.phone ??
                  undefined),
              subtotal,
              shippingCost: Number(order.shippingCost),
              excludeOrderId: id,
              lines: lines.map((l) => ({
                productId: l.productId,
                categoryId: cat.get(l.productId) ?? '',
                lineTotal: Number(l.total),
              })),
            },
            tx,
          );
          if (result.valid) {
            if (result.discountAmount !== Number(order.discountAmount)) {
              warnings.push(
                `Coupon ${order.couponCode} recalculated: discount ${Number(order.discountAmount)} → ${result.discountAmount}.`,
              );
            }
            discount = result.discountAmount;
            await tx.couponUsage.updateMany({
              where: { orderId: id },
              data: { discountAmount: result.discountAmount },
            });
          } else {
            // e.g. the order is now below the coupon's minimum
            discount = 0;
            couponRemoved = true;
            const usages = await tx.couponUsage.findMany({
              where: { orderId: id },
            });
            for (const u of usages) {
              await tx.coupon.updateMany({
                where: { id: u.couponId, usageCount: { gt: 0 } },
                data: { usageCount: { decrement: 1 } },
              });
            }
            await tx.couponUsage.deleteMany({ where: { orderId: id } });
            warnings.push(
              `Coupon ${order.couponCode} no longer applies (${result.message}) and was removed from the order.`,
            );
          }
        }
      }
      discount = Math.min(discount, subtotal);

      let shippingCost = dto.shippingCost ?? Number(order.shippingCost);
      let zone: string | null = order.shippingZone;
      if (dto.shippingCost === undefined && dto.recalculateShipping) {
        const prods = await tx.product.findMany({
          where: { id: { in: lines.map((l) => l.productId) } },
          select: { freeShipping: true },
        });
        const quote = await this.shipping.quote(subtotal, {
          city:
            order.shippingAddress?.district ??
            order.shippingAddress?.city ??
            undefined,
          allItemsFreeShipping:
            prods.length > 0 && prods.every((p) => p.freeShipping),
        });
        shippingCost = quote.cost;
        zone = quote.zone;
      }

      const newTotal = await this.applyTotals(tx, order, {
        subtotal,
        discount,
        shippingCost,
        extra: {
          shippingZone: zone,
          ...(couponRemoved ? { couponCode: null } : {}),
        },
      });
      const brief = (
        rows: { productName: string; quantity: number; price: unknown }[],
      ) =>
        rows.map((i) => ({
          item: i.productName,
          qty: i.quantity,
          price: Number(i.price),
        }));
      await writeAudit(tx, {
        adminId,
        action: 'ORDER_EDITED',
        entity: 'Order',
        entityId: id,
        oldValue: {
          orderNumber: order.orderNumber,
          items: brief(order.items),
          discount: Number(order.discountAmount),
          shipping: Number(order.shippingCost),
          total: Number(order.total),
        },
        newValue: {
          orderNumber: order.orderNumber,
          items: brief(lines),
          discount,
          shipping: shippingCost,
          total: newTotal,
          reason: dto.reason,
        },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          fromStatus: order.status,
          toStatus: order.status,
          note: `Order items changed by admin${dto.reason ? `: ${dto.reason}` : ''}`,
          changedBy: 'admin',
        },
      });
    });

    const updated = await this.orders.findOne(id);
    return warnings.length ? { ...updated, warnings } : updated;
  }

  // ---------- phone orders ----------

  /** What delivery would cost for these items and district (the same rule checkout uses). */
  async quoteShipping(
    subtotal: number,
    district?: string,
    productIds: string[] = [],
  ) {
    let allFree = false;
    if (productIds.length) {
      const rows = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { freeShipping: true },
      });
      allFree = rows.length > 0 && rows.every((p) => p.freeShipping);
    }
    const area = this.locations.resolve({ district });
    return this.shipping.quote(subtotal, {
      city: area.district ?? district,
      allItemsFreeShipping: allFree,
    });
  }

  async create(dto: CreateOrderDto, adminId: string) {
    const walkIn = !!dto.walkIn;
    if (!walkIn && !dto.shippingAddress)
      throw new BadRequestException('Delivery address is required');
    const addr = dto.shippingAddress;
    const phone = walkIn
      ? dto.walkInPhone
        ? normalizeBdPhone(dto.walkInPhone)
        : null
      : normalizeBdPhone(addr!.phone);
    const area = this.locations.resolve({
      division: addr?.division,
      district: addr?.district,
      upazila: addr?.upazila,
    });
    const city = walkIn ? 'Walk-in' : addr!.city?.trim() || area.district;
    if (!city)
      throw new BadRequestException('Choose a district (or enter a city)');
    if (dto.couponCode && dto.discountAmount !== undefined) {
      throw new BadRequestException(
        'Use either a coupon code or a manual discount, not both',
      );
    }
    if (dto.items.some((l) => !l.productId)) {
      throw new BadRequestException('Each line needs a productId');
    }
    const customerName = walkIn
      ? dto.walkInName?.trim() || 'Walk-in customer'
      : addr!.fullName;

    let userId: string | null = null;
    if (dto.customer?.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.customer.userId },
        select: { id: true, status: true, role: true },
      });
      if (!user || user.role !== 'USER')
        throw new BadRequestException('Customer not found');
      if (user.status !== 'ACTIVE')
        throw new BadRequestException('This customer account is not active');
      userId = user.id;
    }
    const guestEmail = userId
      ? null
      : dto.customer?.email?.trim().toLowerCase() || null;

    const created = await this.prisma.$transaction(async (tx) => {
      const products = await this.loadProducts(
        tx,
        dto.items.map((l) => l.productId!),
      );
      const rows = dto.items.map((l) => this.buildLine(l, products));
      const seen = new Set<string>();
      for (const r of rows) {
        const key = `${r.productId}:${r.variantId ?? ''}`;
        if (seen.has(key)) {
          throw new BadRequestException(
            `"${r.productName}" is listed twice: use one line with the full quantity`,
          );
        }
        seen.add(key);
      }

      const subtotal = round2(rows.reduce((s, r) => s + r.total, 0));
      const lineProducts = rows.map((r) => products.get(r.productId)!);

      let shippingCost = walkIn ? 0 : dto.shippingCost;
      if (shippingCost === undefined) {
        const quote = await this.shipping.quote(subtotal, {
          city: area.district ?? city,
          allItemsFreeShipping: lineProducts.every((p) => p.freeShipping),
        });
        shippingCost = quote.cost;
      }
      const zoneQuote = walkIn
        ? null
        : await this.shipping.quote(subtotal, { city: area.district ?? city });

      let discount = dto.discountAmount ?? 0;
      let couponResult: Awaited<ReturnType<CouponsService['evaluate']>> | null =
        null;
      if (dto.couponCode) {
        couponResult = await this.coupons.evaluate(
          dto.couponCode,
          {
            userId: userId ?? undefined,
            guestPhone: userId ? undefined : (phone ?? undefined),
            subtotal,
            shippingCost,
            lines: rows.map((r, i) => ({
              productId: r.productId,
              categoryId: lineProducts[i].categoryId,
              lineTotal: r.total,
            })),
          },
          tx,
        );
        if (!couponResult.valid)
          throw new BadRequestException(couponResult.message);
        discount = couponResult.discountAmount;
        shippingCost = round2(shippingCost - couponResult.shippingDiscount);
      }
      discount = Math.min(discount, subtotal);
      const total = round2(Math.max(0, subtotal - discount) + shippingCost);

      const amountPaid = dto.amountPaid ?? 0;
      if (amountPaid > total) {
        throw new BadRequestException(
          'The amount paid is more than the order total',
        );
      }

      const orderNumber = await nextOrderNumber(tx);
      for (const r of rows) {
        const ok = await tx.product.updateMany({
          where: { id: r.productId, status: 'ACTIVE' },
          data: {
            soldCount: { increment: r.quantity },
            totalSales: { increment: r.quantity },
          },
        });
        if (ok.count === 0)
          throw new BadRequestException(`"${r.productName}" is not available`);
        try {
          await this.stock.change(tx, {
            productId: r.productId,
            variantId: r.variantId,
            change: -r.quantity,
            reason: 'SALE',
            reference: `${walkIn ? 'Walk-in sale' : 'Phone order'}: ${orderNumber}`,
            adminId,
          });
        } catch (e) {
          if (e instanceof InsufficientStockError) {
            throw new BadRequestException(
              `"${r.productName}": only ${e.available} in stock`,
            );
          }
          throw e;
        }
      }

      const address = walkIn
        ? null
        : await tx.address.create({
            data: {
              fullName: addr!.fullName,
              phone: phone!,
              line1: addr!.address,
              city,
              state: area.division,
              division: area.division,
              district: area.district,
              upazila: area.upazila,
              postalCode: addr!.postalCode ?? '',
              country: 'Bangladesh',
              userId,
              label: 'Shipping',
            },
          });

      const status = dto.status ?? 'CONFIRMED';
      const order = await tx.order.create({
        data: {
          orderNumber,
          source: 'ADMIN',
          createdByAdminId: adminId,
          userId,
          guestName: userId ? null : customerName,
          guestPhone: userId ? null : phone,
          guestEmail,
          subtotal,
          shippingCost,
          taxAmount: 0,
          discountAmount: discount,
          couponCode: couponResult?.valid ? couponResult.code : null,
          total,
          paidAmount: 0,
          dueAmount: total,
          status,
          confirmedAt: status === 'CONFIRMED' ? new Date() : null,
          paymentStatus: 'PENDING',
          paymentMethod: dto.paymentMethod,
          bkashTransactionId:
            dto.paymentMethod !== 'CASH_ON_DELIVERY'
              ? (dto.transactionId ?? null)
              : null,
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          deliveryNote: dto.deliveryNote ?? null,
          internalNote: dto.internalNote ?? null,
          shippingAddressId: address?.id ?? null,
          shippingZone: zoneQuote?.zone ?? null,
          items: { create: rows },
          statusHistory: {
            create: {
              toStatus: status,
              note: walkIn
                ? 'Walk-in sale created by admin'
                : 'Order created by admin (phone order)',
              changedBy: 'admin',
            },
          },
        },
      });

      await writeAudit(tx, {
        adminId,
        action: 'ORDER_CREATED',
        entity: 'Order',
        entityId: order.id,
        newValue: {
          orderNumber,
          total,
          paymentMethod: dto.paymentMethod,
          customer: customerName,
          walkIn,
          items: rows.length,
        },
      });
      if (couponResult?.valid) {
        await this.coupons.redeem(
          tx,
          couponResult,
          userId ? { userId } : { guestPhone: phone ?? '' },
          order.id,
        );
      }
      if (userId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            totalOrders: { increment: 1 },
            totalSpent: { increment: total },
          },
        });
      }
      if (amountPaid > 0) {
        await recordReceivedPayment(tx, order, {
          amount: amountPaid,
          method: dto.paymentMethod,
          transactionId: dto.transactionId,
          note: 'Received when the order was created',
        });
      }
      return order;
    });

    if (dto.notifyCustomer !== false) {
      void this.notifier.orderPlaced(created.id, { skipAdminEmail: true });
    }
    return this.orders.findOne(created.id);
  }

  // ---------- helpers ----------

  private assertEditable(status: string) {
    if (!EDITABLE.includes(status)) {
      throw new BadRequestException(
        `A ${status} order can no longer be changed (only before it is handed to the courier)`,
      );
    }
  }

  private async loadProducts(tx: Tx, ids: string[]) {
    const unique = [...new Set(ids)];
    const rows = await tx.product.findMany({
      where: { id: { in: unique } },
      select: productForLine,
    });
    return new Map<string, LineProduct>(rows.map((p) => [p.id, p]));
  }

  // A new order line from the current product (and variant) data.
  private buildLine(line: OrderLineDto, products: Map<string, LineProduct>) {
    const product = products.get(line.productId!);
    if (!product) throw new BadRequestException('A product was not found');
    if (product.status !== 'ACTIVE') {
      throw new BadRequestException(
        `"${product.name}" is not available for sale`,
      );
    }
    let variant: LineProduct['variants'][number] | undefined;
    if (product.variants.length) {
      if (!line.variantId) {
        throw new BadRequestException(
          `"${product.name}" has variants: choose one`,
        );
      }
      variant = product.variants.find((v) => v.id === line.variantId);
      if (!variant)
        throw new BadRequestException(
          `That variant does not belong to "${product.name}"`,
        );
    } else if (line.variantId) {
      throw new BadRequestException(`"${product.name}" has no variants`);
    }
    const price = line.price ?? Number(variant?.price ?? product.sellingPrice);
    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      quantity: line.quantity,
      price,
      total: round2(price * line.quantity),
      productName: product.name,
      productSlug: product.slug,
      productImage: product.images[0]?.url ?? null,
      variantName: variant?.name ?? null,
      variantSku: variant?.sku ?? null,
    };
  }

  // Writes new money totals and keeps due / payment status / the customer's
  // lifetime spend consistent.
  private async applyTotals(
    tx: Tx,
    order: {
      id: string;
      userId: string | null;
      total: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      paymentStatus: Parameters<typeof paymentStatusAfterTotalChange>[0];
    },
    t: {
      subtotal: number;
      discount: number;
      shippingCost: number;
      extra?: Prisma.OrderUpdateInput;
    },
  ) {
    const total = round2(
      Math.max(0, t.subtotal - t.discount) +
        t.shippingCost +
        Number(order.taxAmount),
    );
    const paid = Number(order.paidAmount);
    await tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: t.subtotal,
        discountAmount: t.discount,
        shippingCost: t.shippingCost,
        total,
        dueAmount: dueFor(total, paid),
        paymentStatus: paymentStatusAfterTotalChange(
          order.paymentStatus,
          total,
          paid,
        ),
        ...t.extra,
      },
    });
    const delta = round2(total - Number(order.total));
    if (order.userId && delta !== 0) {
      await tx.user.update({
        where: { id: order.userId },
        data: { totalSpent: { increment: delta } },
      });
    }
    return total;
  }
}
