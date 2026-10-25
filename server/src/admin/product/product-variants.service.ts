import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { StockService } from '../../common/inventory';
import { ProductVariantInputDto } from './dto/create-product.dto';
import { UpdateVariantDto } from './dto/product-admin.dto';
import { AuditService } from '../../common/audit';
import { ProductService } from './product.service';

@Injectable()
export class ProductVariantsService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private stock: StockService,
    private products: ProductService,
    private audit: AuditService,
  ) {}

  async list(productId: string) {
    await this.products.assertExists(productId);
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    productId: string,
    dto: ProductVariantInputDto,
    adminId: string,
  ) {
    await this.products.assertExists(productId);
    const [row] = await this.products.prepareVariants([dto]);

    const created = await this.prisma
      .$transaction(async (tx) => {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: productId },
          select: { stock: true, _count: { select: { variants: true } } },
        });
        // The first variant takes over the stock the product already had
        // (unless the admin entered a number), so nothing silently vanishes.
        const opening =
          dto.stock === undefined && product._count.variants === 0
            ? product.stock
            : row.stock;

        const variant = await tx.productVariant.create({
          data: { ...row, stock: 0, productId },
        });
        if (product._count.variants === 0 && product.stock > 0) {
          // product-level stock is replaced by the variant's from here on
          await tx.product.update({
            where: { id: productId },
            data: { stock: 0 },
          });
        }
        if (opening > 0) {
          await this.stock.change(tx, {
            productId,
            variantId: variant.id,
            change: opening,
            reason: 'RESTOCK',
            note:
              dto.stock === undefined && product._count.variants === 0
                ? 'Stock moved from the product to its first variant'
                : 'Opening stock',
            adminId,
          });
        } else {
          await this.stock.syncProductStock(tx, productId);
        }
        return tx.productVariant.findUniqueOrThrow({
          where: { id: variant.id },
        });
      })
      .catch(rethrowUnique);

    this.cache.delByPrefix('products:');
    return created;
  }

  // Stock is changed through the inventory endpoints (so it is logged with
  // a reason), not here.
  async update(
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
    adminId: string,
  ) {
    const variant = await this.find(productId, variantId);
    if (dto.stock !== undefined) {
      throw new BadRequestException(
        'Change stock with POST /admin/inventory/adjust so it is recorded in the stock log',
      );
    }

    const data: Prisma.ProductVariantUncheckedUpdateInput = {};
    if (dto.sku !== undefined && dto.sku.trim() !== variant.sku) {
      const sku = dto.sku.trim();
      const taken = await this.prisma.productVariant.findFirst({
        where: { sku, NOT: { id: variantId } },
      });
      if (taken) throw new ConflictException(`SKU "${sku}" is already used`);
      data.sku = sku;
    }
    for (const k of [
      'barcode',
      'price',
      'imageUrl',
      'attribute1Name',
      'attribute1Value',
      'attribute2Name',
      'attribute2Value',
      'attribute3Name',
      'attribute3Value',
    ] as const) {
      if (dto[k] !== undefined) (data as Record<string, unknown>)[k] = dto[k];
    }
    if (
      dto.name !== undefined ||
      Object.keys(data).some((k) => k.startsWith('attribute'))
    ) {
      // keep the name in step with the attributes unless the admin set one
      data.name =
        dto.name?.trim() ||
        [
          dto.attribute1Value ?? variant.attribute1Value,
          dto.attribute2Value ?? variant.attribute2Value,
          dto.attribute3Value ?? variant.attribute3Value,
        ]
          .filter(Boolean)
          .join(' / ') ||
        variant.name;
    }

    const updated = await this.prisma.productVariant
      .update({ where: { id: variantId }, data })
      .catch(rethrowUnique);
    if (
      dto.price !== undefined &&
      Number(variant.price ?? -1) !== Number(updated.price ?? -1)
    ) {
      await this.audit.recordSafe({
        adminId,
        action: 'PRICE_CHANGED',
        entity: 'ProductVariant',
        entityId: variantId,
        oldValue: {
          sku: variant.sku,
          price: variant.price ? Number(variant.price) : null,
        },
        newValue: {
          sku: updated.sku,
          price: updated.price ? Number(updated.price) : null,
        },
      });
    }
    this.cache.delByPrefix('products:');
    return updated;
  }

  async remove(productId: string, variantId: string, adminId: string) {
    const variant = await this.find(productId, variantId);
    const orders = await this.prisma.orderItem.count({ where: { variantId } });
    if (orders > 0) {
      throw new ConflictException(
        'This variant is part of existing orders and cannot be deleted. Set its stock to 0 instead.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { variantId } });
      if (variant.stock > 0) {
        await tx.stockLog.create({
          data: {
            productId,
            change: -variant.stock,
            reason: 'ADJUSTMENT',
            note: `Variant ${variant.sku} deleted`,
            quantityBefore: variant.stock,
            quantityAfter: 0,
            adminId,
          },
        });
      }
      await tx.productVariant.delete({ where: { id: variantId } });
      const left = await tx.productVariant.count({ where: { productId } });
      if (left > 0) await this.stock.syncProductStock(tx, productId);
      else
        await tx.product.update({
          where: { id: productId },
          data: { stock: 0 },
        });
    });
    this.cache.delByPrefix('products:');
    return { success: true };
  }

  private async find(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    return variant;
  }
}

function rethrowUnique(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    throw new ConflictException('That SKU is already used');
  }
  throw error;
}
