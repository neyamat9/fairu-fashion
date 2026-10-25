import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, StockLogReason } from '@prisma/client';
import { addAdminNotification } from '../admin-feed/admin-feed';
import { writeAudit } from '../audit/audit.service';

type Tx = Prisma.TransactionClient;

export interface StockChangeInput {
  productId: string;
  variantId?: string | null;
  // Positive adds stock, negative removes it.
  change: number;
  reason: StockLogReason;
  reference?: string | null;
  note?: string | null;
  adminId?: string | null;
  // For giving stock back (cancel / return): if the product has meanwhile
  // gained variants and the line has none, do not fail — note it instead.
  lenient?: boolean;
}

export interface StockChangeResult {
  productId: string;
  variantId: string | null;
  before: number;
  after: number;
}

// The one place that moves stock. Rules:
//  - A product without variants keeps its quantity in Product.stock.
//  - A product WITH variants keeps it per variant (ProductVariant.stock) and
//    Product.stock is always their sum, so listings and "in stock" checks
//    keep working. Product.stock is recalculated after every change.
//  - Quantities can never go below zero, even with simultaneous orders: the
//    decrement is a conditional UPDATE.
//  - Every change is written to the stock log.
@Injectable()
export class StockService {
  async change(tx: Tx, input: StockChangeInput): Promise<StockChangeResult> {
    if (!Number.isInteger(input.change) || input.change === 0) {
      throw new BadRequestException(
        'Stock change must be a non-zero whole number',
      );
    }
    const { productId, change } = input;
    const variantId = input.variantId ?? null;

    let before: number;
    let after: number;

    if (variantId) {
      const variant = await tx.productVariant.findFirst({
        where: { id: variantId, productId },
      });
      if (!variant)
        throw new BadRequestException('Variant not found for this product');
      before = variant.stock;

      const updated = await tx.productVariant.updateMany({
        where: {
          id: variantId,
          ...(change < 0 ? { stock: { gte: -change } } : {}),
        },
        data: { stock: { increment: change } },
      });
      if (updated.count === 0)
        throw new InsufficientStockError(variant.stock, -change);
      after = (
        await tx.productVariant.findUniqueOrThrow({ where: { id: variantId } })
      ).stock;
      await this.syncProductStock(tx, productId);
    } else {
      const product = await tx.product.findUniqueOrThrow({
        where: { id: productId },
        select: { stock: true, _count: { select: { variants: true } } },
      });
      if (product._count.variants > 0 && input.lenient) {
        await tx.stockLog.create({
          data: {
            productId,
            change: 0,
            reason: input.reason,
            reference: input.reference ?? null,
            note: `Not restocked: the product now has variants (${change} unit(s) to add back by hand)`,
            quantityBefore: product.stock,
            quantityAfter: product.stock,
          },
        });
        return {
          productId,
          variantId: null,
          before: product.stock,
          after: product.stock,
        };
      }
      if (product._count.variants > 0) {
        throw new BadRequestException(
          'This product has variants. Change the stock of a variant instead.',
        );
      }
      before = product.stock;
      const updated = await tx.product.updateMany({
        where: {
          id: productId,
          ...(change < 0 ? { stock: { gte: -change } } : {}),
        },
        data: { stock: { increment: change } },
      });
      if (updated.count === 0)
        throw new InsufficientStockError(product.stock, -change);
      after = (await tx.product.findUniqueOrThrow({ where: { id: productId } }))
        .stock;
    }

    await tx.stockLog.create({
      data: {
        productId,
        variantId,
        change,
        reason: input.reason,
        reference: input.reference ?? null,
        note: input.note ?? null,
        quantityBefore: before,
        quantityAfter: after,
        adminId: input.adminId ?? null,
      },
    });
    await this.afterChange(tx, input, { variantId, before, after });
    return { productId, variantId, before, after };
  }

  // Side effects of a real stock change: the admin bell when an item runs
  // low / out, and the audit trail for changes made by an admin by hand.
  private async afterChange(
    tx: Tx,
    input: StockChangeInput,
    r: { variantId: string | null; before: number; after: number },
  ) {
    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { name: true, lowStockThreshold: true },
    });
    if (!product) return;
    let label = product.name;
    if (r.variantId) {
      const v = await tx.productVariant.findUnique({
        where: { id: r.variantId },
        select: { name: true, sku: true },
      });
      if (v) label = `${product.name} (${v.name})`;
    }

    if (r.before > 0 && r.after <= 0) {
      await addAdminNotification(tx, {
        type: 'OUT_OF_STOCK',
        title: `Out of stock: ${label}`,
        body: `${label} has run out of stock.`,
        entityType: 'product',
        entityId: input.productId,
        data: { productId: input.productId, variantId: r.variantId },
      });
    } else if (
      r.before > product.lowStockThreshold &&
      r.after <= product.lowStockThreshold &&
      r.after > 0
    ) {
      await addAdminNotification(tx, {
        type: 'LOW_STOCK',
        title: `Low stock: ${label}`,
        body: `${label} is down to ${r.after} (alert level ${product.lowStockThreshold}).`,
        entityType: 'product',
        entityId: input.productId,
        data: {
          productId: input.productId,
          variantId: r.variantId,
          stock: r.after,
        },
      });
    }

    const manual: StockLogReason[] = [
      'RESTOCK',
      'ADJUSTMENT',
      'DAMAGED',
      'TRANSFER',
    ];
    if (input.adminId && manual.includes(input.reason)) {
      await writeAudit(tx, {
        adminId: input.adminId,
        action: 'STOCK_ADJUSTED',
        entity: r.variantId ? 'ProductVariant' : 'Product',
        entityId: r.variantId ?? input.productId,
        oldValue: { item: label, stock: r.before },
        newValue: {
          item: label,
          stock: r.after,
          reason: input.reason,
          note: input.note ?? null,
        },
      });
    }
  }

  // Sets the quantity to an exact number (stock count / correction).
  async setTo(
    tx: Tx,
    input: Omit<StockChangeInput, 'change'> & { quantity: number },
  ): Promise<StockChangeResult | null> {
    if (!Number.isInteger(input.quantity) || input.quantity < 0) {
      throw new BadRequestException('Stock must be a whole number, 0 or more');
    }
    const variantId = input.variantId ?? null;
    const current = variantId
      ? (
          await tx.productVariant.findFirst({
            where: { id: variantId, productId: input.productId },
          })
        )?.stock
      : (await tx.product.findUniqueOrThrow({ where: { id: input.productId } }))
          .stock;
    if (current === undefined)
      throw new BadRequestException('Variant not found for this product');
    const diff = input.quantity - current;
    if (diff === 0) return null;
    return this.change(tx, { ...input, change: diff });
  }

  // Product.stock = sum of its variants (only when it has any).
  async syncProductStock(tx: Tx, productId: string): Promise<void> {
    const agg = await tx.productVariant.aggregate({
      where: { productId },
      _sum: { stock: true },
      _count: { _all: true },
    });
    if (agg._count._all > 0) {
      await tx.product.update({
        where: { id: productId },
        data: { stock: agg._sum.stock ?? 0 },
      });
    }
  }
}

export class InsufficientStockError extends BadRequestException {
  constructor(
    public readonly available: number,
    public readonly requested: number,
  ) {
    super(`Only ${available} in stock (needed ${requested})`);
  }
}
