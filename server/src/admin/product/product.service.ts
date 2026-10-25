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
import { UploadsService } from '../../common/uploads';
import { slugify } from '../../common/utils/slug';
import { writeAudit } from '../../common/audit';
import {
  CreateProductDto,
  ProductVariantInputDto,
} from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AdminProductQueryDto } from './dto/product-admin.dto';
import { computePricing, validatePricing } from './product-pricing';

const num = (d: Prisma.Decimal | number | null | undefined) =>
  d === null || d === undefined ? null : Number(d);

const SORTS: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  name: { name: 'asc' },
  'price-asc': { sellingPrice: 'asc' },
  'price-desc': { sellingPrice: 'desc' },
  'stock-asc': { stock: 'asc' },
  'stock-desc': { stock: 'desc' },
  sold: { soldCount: 'desc' },
};

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private stock: StockService,
    private uploads: UploadsService,
  ) {}

  // ---------- list / detail ----------

  /** Numbers for the cards above the products list (whole catalogue, not the current filter). */
  async stats() {
    const [row] = await this.prisma.$queryRaw<
      {
        total: bigint;
        active: bigint;
        hidden: bigint;
        low: bigint;
        out: bigint;
        costValue: string | null;
        retailValue: string | null;
        discounted: bigint;
        noPhoto: bigint;
      }[]
    >(Prisma.sql`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE p.status = 'ACTIVE') AS active,
             COUNT(*) FILTER (WHERE p.status IN ('DRAFT', 'INACTIVE')) AS hidden,
             COUNT(*) FILTER (WHERE p.stock > 0 AND p.stock <= p."lowStockThreshold") AS low,
             COUNT(*) FILTER (WHERE p.stock <= 0) AS out,
             SUM(GREATEST(p.stock, 0) * p."buyingPrice")::text AS "costValue",
             SUM(GREATEST(p.stock, 0) * p."sellingPrice")::text AS "retailValue",
             COUNT(*) FILTER (WHERE p."isDiscounted" AND p.status = 'ACTIVE') AS discounted,
             COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "ProductImage" i WHERE i."productId" = p.id)) AS "noPhoto"
      FROM "Product" p`);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const best = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          placedAt: { gte: since },
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED'] },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 1,
    });
    const top = best[0]
      ? await this.prisma.product.findUnique({
          where: { id: best[0].productId },
          select: { id: true, name: true },
        })
      : null;

    return {
      total: Number(row.total),
      active: Number(row.active),
      hidden: Number(row.hidden),
      lowStock: Number(row.low),
      outOfStock: Number(row.out),
      stockValueAtCost: Number(row.costValue ?? 0),
      stockValueAtRetail: Number(row.retailValue ?? 0),
      onDiscount: Number(row.discounted),
      withoutPhoto: Number(row.noPhoto),
      bestSeller: top
        ? { id: top.id, name: top.name, units: best[0]._sum.quantity ?? 0 }
        : null,
    };
  }

  async findAll(q: AdminProductQueryDto) {
    const where: Prisma.ProductWhereInput = {};
    const and: Prisma.ProductWhereInput[] = [];
    const search = q.search?.trim();
    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { productCode: { contains: search, mode: 'insensitive' } },
          { brandName: { contains: search, mode: 'insensitive' } },
          {
            variants: {
              some: { sku: { contains: search, mode: 'insensitive' } },
            },
          },
        ],
      });
    }
    if (q.status) where.status = q.status;
    else if (q.visibility === 'hidden')
      where.status = { in: ['DRAFT', 'INACTIVE'] };
    if (q.onDiscount) {
      where.isDiscounted = true;
      if (!q.status) where.status = 'ACTIVE';
    }
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.brandId) where.brandId = q.brandId;
    const low = this.prisma.product.fields.lowStockThreshold;
    if (q.stock === 'out') where.stock = { lte: 0 };
    if (q.stock === 'low') where.stock = { gt: 0, lte: low };
    if (q.stock === 'in') where.stock = { gt: low };
    if (and.length) where.AND = and;

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          productCode: true,
          status: true,
          brandName: true,
          categoryName: true,
          buyingPrice: true,
          regularPrice: true,
          sellingPrice: true,
          priceBeforeDiscount: true,
          discountPrice: true,
          discountStart: true,
          discountEnd: true,
          isDiscounted: true,
          stock: true,
          lowStockThreshold: true,
          soldCount: true,
          isFeatured: true,
          createdAt: true,
          updatedAt: true,
          images: { where: { isMain: true }, take: 1, select: { url: true } },
          _count: {
            select: { variants: true, orderItems: true, reviews: true },
          },
        },
        orderBy: [SORTS[q.sortBy ?? 'newest'], { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = rows.map(({ images, ...p }) => ({
      ...p,
      mainImage: images[0]?.url ?? null,
      stockState: stockState(p.stock, p.lowStockThreshold),
    }));
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
        variants: { orderBy: { createdAt: 'asc' } },
        specifications: {
          include: { items: { orderBy: { displayOrder: 'asc' } } },
          orderBy: { displayOrder: 'asc' },
        },
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        tags: { orderBy: { tag: 'asc' } },
        attributes: true,
        priceHistory: { orderBy: { recordedAt: 'desc' }, take: 30 },
        _count: {
          select: { orderItems: true, reviews: true, questions: true },
        },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return {
      ...product,
      tags: product.tags.map((t) => t.tag),
      inTheBox: parseJsonList(product.inTheBox),
      // the everyday price, whether or not a promotion is running right now
      normalPrice: num(product.priceBeforeDiscount ?? product.sellingPrice),
      stockState: stockState(product.stock, product.lowStockThreshold),
    };
  }

  // ---------- create ----------

  async create(dto: CreateProductDto, adminId: string) {
    const name = dto.name.trim();
    const normalPrice = dto.sellingPrice;
    const pricing = this.pricingFrom({
      regularPrice: dto.regularPrice,
      normalPrice,
      buyingPrice: dto.buyingPrice,
      discountPrice: dto.discountPrice ?? null,
      discountStart: dto.discountStart ?? null,
      discountEnd: dto.discountEnd ?? null,
    });

    const variants = dto.variants ?? [];
    if (variants.length && dto.stock !== undefined) {
      throw new BadRequestException(
        'This product has variants: set the stock on each variant, not on the product',
      );
    }
    const variantRows = await this.prepareVariants(variants);

    const area = await this.resolveCatalog(
      dto.categoryId,
      dto.subCategoryId,
      dto.brandId,
    );
    await this.assertNameFree(name);
    if (dto.productCode) await this.assertCodeFree(dto.productCode);
    const slug = dto.slug ?? (await this.freeSlug(slugify(name, 'product')));
    if (dto.slug) await this.assertSlugFree(dto.slug);

    const startStock = variantRows.length
      ? variantRows.reduce((s, v) => s + v.stock, 0)
      : (dto.stock ?? 0);
    const tags = normalizeTags(dto.tags);
    const attributes = normalizeAttributes(dto.attributes);

    const id = await this.prisma
      .$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name,
            slug,
            productCode: dto.productCode || null,
            barcode: dto.barcode,
            description: dto.description,
            shortDescription: dto.shortDescription,
            warrantyInfo: dto.warrantyInfo,
            status: dto.status ?? 'ACTIVE',
            buyingPrice: dto.buyingPrice,
            regularPrice: dto.regularPrice,
            sellingPrice: pricing.sellingPrice,
            priceBeforeDiscount: pricing.priceBeforeDiscount,
            isDiscounted: pricing.isDiscounted,
            profitMargin: pricing.profitMargin,
            discountPrice: dto.discountPrice ?? null,
            discountStart: dto.discountStart ?? null,
            discountEnd: dto.discountEnd ?? null,
            discountLabel:
              dto.discountPrice == null ? null : (dto.discountLabel ?? null),
            stock: 0,
            lowStockThreshold: dto.lowStockThreshold ?? 5,
            freeShipping: dto.freeShipping ?? false,
            weight: dto.weight,
            length: dto.length,
            width: dto.width,
            height: dto.height,
            isFeatured: dto.isFeatured ?? false,
            isNew: dto.isNew ?? false,
            isHot: dto.isHot ?? false,
            isBestSeller: dto.isBestSeller ?? false,
            isLimitedStock: dto.isLimitedStock ?? false,
            metaTitle: dto.metaTitle,
            metaDescription: dto.metaDescription,
            metaKeywords: dto.metaKeywords,
            inTheBox: dto.inTheBox?.length
              ? JSON.stringify(dto.inTheBox)
              : null,
            hasSpecification:
              dto.hasSpecification ?? !!dto.specifications?.length,
            brandId: dto.brandId,
            categoryId: dto.categoryId,
            subCategoryId: dto.subCategoryId,
            ...area,
            specifications: dto.specifications?.length
              ? { create: specCreate(dto.specifications) }
              : undefined,
            attributes: attributes.length ? { create: attributes } : undefined,
            tags: tags.length
              ? { create: tags.map((tag) => ({ tag })) }
              : undefined,
          },
        });

        await tx.priceHistory.create({
          data: { productId: product.id, price: pricing.sellingPrice },
        });
        await writeAudit(tx, {
          adminId,
          action: 'PRODUCT_CREATED',
          entity: 'Product',
          entityId: product.id,
          newValue: {
            name,
            sellingPrice: normalPrice,
            regularPrice: dto.regularPrice,
            buyingPrice: dto.buyingPrice,
            status: product.status,
          },
        });

        for (const v of variantRows) {
          const created = await tx.productVariant.create({
            data: { ...v, stock: 0, productId: product.id },
          });
          if (v.stock > 0) {
            await this.stock.change(tx, {
              productId: product.id,
              variantId: created.id,
              change: v.stock,
              reason: 'RESTOCK',
              note: 'Opening stock',
              adminId,
            });
          }
        }
        if (!variantRows.length && startStock > 0) {
          await this.stock.change(tx, {
            productId: product.id,
            change: startStock,
            reason: 'RESTOCK',
            note: 'Opening stock',
            adminId,
          });
        }
        return product.id;
      })
      .catch(rethrowUnique);

    this.cache.delByPrefix('products:');
    return this.findOne(id);
  }

  // ---------- update ----------

  async update(id: string, dto: UpdateProductDto, adminId: string) {
    const current = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { variants: true } } },
    });
    if (!current) throw new NotFoundException('Product not found');

    const hasVariants = current._count.variants > 0;
    if (dto.stock !== undefined && hasVariants) {
      throw new BadRequestException(
        'This product has variants: change the stock of a variant instead',
      );
    }

    const data: Prisma.ProductUncheckedUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== current.name) await this.assertNameFree(name, id);
      data.name = name;
    }
    if (dto.slug !== undefined && dto.slug !== current.slug) {
      await this.assertSlugFree(dto.slug, id);
      data.slug = dto.slug;
    }
    if (dto.productCode !== undefined) {
      const code = dto.productCode || null;
      if (code && code !== current.productCode)
        await this.assertCodeFree(code, id);
      data.productCode = code;
    }

    // --- prices: merge the request over the stored values ---
    const normalPrice =
      dto.sellingPrice ??
      num(current.priceBeforeDiscount ?? current.sellingPrice)!;
    const merged = {
      regularPrice: dto.regularPrice ?? Number(current.regularPrice),
      normalPrice,
      buyingPrice: dto.buyingPrice ?? Number(current.buyingPrice),
      discountPrice:
        dto.discountPrice !== undefined
          ? dto.discountPrice
          : num(current.discountPrice),
      discountStart:
        dto.discountPrice === null
          ? null
          : dto.discountStart !== undefined
            ? dto.discountStart
            : current.discountStart,
      discountEnd:
        dto.discountPrice === null
          ? null
          : dto.discountEnd !== undefined
            ? dto.discountEnd
            : current.discountEnd,
    };
    // Dates of a promotion that is already over are not re-validated when
    // the admin only edits something unrelated.
    const touchesPromo =
      dto.discountPrice !== undefined ||
      dto.discountStart !== undefined ||
      dto.discountEnd !== undefined ||
      dto.sellingPrice !== undefined ||
      dto.regularPrice !== undefined;
    let pricing = computePricing(merged);
    if (touchesPromo) pricing = this.pricingFrom(merged);
    data.buyingPrice = merged.buyingPrice;
    data.regularPrice = merged.regularPrice;
    data.sellingPrice = pricing.sellingPrice;
    data.priceBeforeDiscount = pricing.priceBeforeDiscount;
    data.isDiscounted = pricing.isDiscounted;
    data.profitMargin = pricing.profitMargin;
    data.discountPrice = merged.discountPrice;
    data.discountStart =
      merged.discountPrice === null ? null : merged.discountStart;
    data.discountEnd =
      merged.discountPrice === null ? null : merged.discountEnd;
    if (merged.discountPrice === null) data.discountLabel = null;
    else if (dto.discountLabel !== undefined)
      data.discountLabel = dto.discountLabel;

    // --- catalog links + denormalized names ---
    const catChanged =
      dto.categoryId !== undefined && dto.categoryId !== current.categoryId;
    if (
      dto.categoryId !== undefined ||
      dto.subCategoryId !== undefined ||
      dto.brandId !== undefined
    ) {
      const categoryId = dto.categoryId ?? current.categoryId;
      const subCategoryId =
        dto.subCategoryId !== undefined
          ? dto.subCategoryId
          : catChanged
            ? undefined
            : (current.subCategoryId ?? undefined);
      const brandId =
        dto.brandId !== undefined
          ? dto.brandId
          : (current.brandId ?? undefined);
      const area = await this.resolveCatalog(
        categoryId,
        subCategoryId,
        brandId,
      );
      data.categoryId = categoryId;
      data.subCategoryId = subCategoryId ?? null;
      data.brandId = brandId ?? null;
      Object.assign(data, area);
    }

    // --- plain fields ---
    const copy = [
      'barcode',
      'description',
      'shortDescription',
      'warrantyInfo',
      'status',
      'lowStockThreshold',
      'freeShipping',
      'weight',
      'length',
      'width',
      'height',
      'isFeatured',
      'isNew',
      'isHot',
      'isBestSeller',
      'isLimitedStock',
      'metaTitle',
      'metaDescription',
      'metaKeywords',
    ] as const;
    for (const k of copy) {
      if (dto[k] !== undefined) (data as Record<string, unknown>)[k] = dto[k];
    }
    if (dto.inTheBox !== undefined) {
      data.inTheBox = dto.inTheBox.length ? JSON.stringify(dto.inTheBox) : null;
    }
    if (dto.specifications !== undefined) {
      data.hasSpecification =
        dto.hasSpecification ?? dto.specifications.length > 0;
    } else if (dto.hasSpecification !== undefined) {
      data.hasSpecification = dto.hasSpecification;
    }

    const attributes = dto.attributes
      ? normalizeAttributes(dto.attributes)
      : undefined;
    const tags = dto.tags ? normalizeTags(dto.tags) : undefined;

    await this.prisma
      .$transaction(async (tx) => {
        await tx.product.update({ where: { id }, data });

        if (attributes) {
          await tx.productAttributeValue.deleteMany({
            where: { productId: id },
          });
          if (attributes.length) {
            await tx.productAttributeValue.createMany({
              data: attributes.map((a) => ({ ...a, productId: id })),
            });
          }
        }
        if (tags) {
          await tx.productTag.deleteMany({ where: { productId: id } });
          if (tags.length) {
            await tx.productTag.createMany({
              data: tags.map((tag) => ({ tag, productId: id })),
            });
          }
        }
        if (dto.specifications) {
          await tx.specificationHeader.deleteMany({ where: { productId: id } });
          for (const [i, s] of specCreate(dto.specifications).entries()) {
            await tx.specificationHeader.create({
              data: { ...s, displayOrder: i, productId: id },
            });
          }
        }
        if (dto.stock !== undefined) {
          await this.stock.setTo(tx, {
            productId: id,
            quantity: dto.stock,
            reason: 'ADJUSTMENT',
            note: 'Edited on the product page',
            adminId,
          });
        }
        const oldPrices = {
          buyingPrice: Number(current.buyingPrice),
          regularPrice: Number(current.regularPrice),
          sellingPrice: num(
            current.priceBeforeDiscount ?? current.sellingPrice,
          ),
          discountPrice: num(current.discountPrice),
        };
        const newPrices = {
          buyingPrice: merged.buyingPrice,
          regularPrice: merged.regularPrice,
          sellingPrice: merged.normalPrice,
          discountPrice: merged.discountPrice,
        };
        const productName = (data.name as string | undefined) ?? current.name;
        if (JSON.stringify(oldPrices) !== JSON.stringify(newPrices)) {
          await writeAudit(tx, {
            adminId,
            action: 'PRICE_CHANGED',
            entity: 'Product',
            entityId: id,
            oldValue: { product: productName, ...oldPrices },
            newValue: { product: productName, ...newPrices },
          });
        }
        if (dto.status !== undefined && dto.status !== current.status) {
          await writeAudit(tx, {
            adminId,
            action: 'PRODUCT_STATUS_CHANGED',
            entity: 'Product',
            entityId: id,
            oldValue: { product: productName, status: current.status },
            newValue: { product: productName, status: dto.status },
          });
        }
        if (pricing.sellingPrice !== Number(current.sellingPrice)) {
          await tx.priceHistory.create({
            data: { productId: id, price: pricing.sellingPrice },
          });
        }
      })
      .catch(rethrowUnique);

    this.cache.delByPrefix('products:');
    return this.findOne(id);
  }

  // ---------- status / delete ----------

  // Products that have orders can never be erased (order history keeps
  // pointing at them), so they are deactivated instead.
  async remove(id: string, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (product._count.orderItems > 0) {
      await this.prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id },
          data: { status: 'INACTIVE' },
        });
        await writeAudit(tx, {
          adminId,
          action: 'PRODUCT_STATUS_CHANGED',
          entity: 'Product',
          entityId: id,
          oldValue: { product: product.name, status: product.status },
          newValue: {
            product: product.name,
            status: 'INACTIVE',
            note: 'Deactivated instead of deleted (has orders)',
          },
        });
      });
      this.cache.delByPrefix('products:');
      return {
        success: true,
        deleted: false,
        message:
          'The product has orders, so it was deactivated instead of deleted',
      };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { productId: id } });
      await tx.wishlistItem.deleteMany({ where: { productId: id } });
      await tx.compareItem.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
      await writeAudit(tx, {
        adminId,
        action: 'PRODUCT_DELETED',
        entity: 'Product',
        entityId: id,
        oldValue: {
          name: product.name,
          sellingPrice: Number(product.sellingPrice),
          stock: product.stock,
        },
      });
    });
    this.cache.delByPrefix('products:');
    return { success: true, deleted: true, message: 'Product deleted' };
  }

  // ---------- duplicate ----------

  async duplicate(id: string, adminId: string) {
    const src = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          include: { upload: true },
        },
        variants: { orderBy: { createdAt: 'asc' } },
        specifications: {
          include: { items: true },
          orderBy: { displayOrder: 'asc' },
        },
        tags: true,
        attributes: true,
      },
    });
    if (!src) throw new NotFoundException('Product not found');

    const name = await this.freeName(`${src.name} (Copy)`);
    const slug = await this.freeSlug(slugify(name, 'product'));
    const normalPrice = num(src.priceBeforeDiscount ?? src.sellingPrice)!;

    // copy the stored photo files first, so the copy never shares files
    const copiedUploads = new Map<string, string>();
    for (const img of src.images) {
      if (img.upload) {
        const copy = await this.uploads.duplicate(img.upload, adminId);
        copiedUploads.set(img.id, copy.id);
      }
    }

    const newId = await this.prisma
      .$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            name,
            slug,
            productCode: null,
            barcode: null,
            description: src.description,
            shortDescription: src.shortDescription,
            warrantyInfo: src.warrantyInfo,
            brandName: src.brandName,
            categoryName: src.categoryName,
            subCategoryName: src.subCategoryName,
            // starts as a draft with no stock, so a copy is never sold by accident
            status: 'DRAFT',
            buyingPrice: src.buyingPrice,
            regularPrice: src.regularPrice,
            sellingPrice: normalPrice,
            isDiscounted: normalPrice < Number(src.regularPrice),
            profitMargin: src.profitMargin,
            stock: 0,
            lowStockThreshold: src.lowStockThreshold,
            inTheBox: src.inTheBox,
            weight: src.weight,
            length: src.length,
            width: src.width,
            height: src.height,
            freeShipping: src.freeShipping,
            shippingCost: src.shippingCost,
            metaTitle: src.metaTitle,
            metaDescription: src.metaDescription,
            metaKeywords: src.metaKeywords,
            isFeatured: false,
            isNew: src.isNew,
            isHot: false,
            isBestSeller: false,
            isLimitedStock: src.isLimitedStock,
            hasSpecification: src.hasSpecification,
            taxRate: src.taxRate,
            taxType: src.taxType,
            brandId: src.brandId,
            categoryId: src.categoryId,
            subCategoryId: src.subCategoryId,
            tags: { create: src.tags.map((t) => ({ tag: t.tag })) },
            attributes: {
              create: src.attributes.map((a) => ({
                name: a.name,
                value: a.value,
              })),
            },
          },
        });

        for (const [i, s] of src.specifications.entries()) {
          await tx.specificationHeader.create({
            data: {
              title: s.title,
              displayOrder: i,
              productId: product.id,
              items: {
                create: s.items.map((it, n) => ({
                  key: it.key,
                  value: it.value,
                  displayOrder: n,
                })),
              },
            },
          });
        }

        for (const [i, img] of src.images.entries()) {
          const uploadId = copiedUploads.get(img.id);
          const upload = uploadId
            ? await tx.upload.findUniqueOrThrow({ where: { id: uploadId } })
            : null;
          await tx.productImage.create({
            data: {
              url: upload ? this.uploads.url(upload.key) : img.url,
              alt: img.alt,
              isMain: img.isMain,
              order: i,
              uploadId,
              productId: product.id,
            },
          });
        }

        const skus = new Set<string>();
        for (const v of src.variants) {
          let sku = `${v.sku}-COPY`;
          for (
            let n = 2;
            skus.has(sku) ||
            (await tx.productVariant.findUnique({ where: { sku } }));
            n++
          ) {
            sku = `${v.sku}-COPY${n}`;
          }
          skus.add(sku);
          await tx.productVariant.create({
            data: {
              name: v.name,
              sku,
              price: v.price,
              stock: 0,
              imageUrl: v.imageUrl,
              attribute1Name: v.attribute1Name,
              attribute1Value: v.attribute1Value,
              attribute2Name: v.attribute2Name,
              attribute2Value: v.attribute2Value,
              attribute3Name: v.attribute3Name,
              attribute3Value: v.attribute3Value,
              productId: product.id,
            },
          });
        }

        await tx.priceHistory.create({
          data: { productId: product.id, price: normalPrice },
        });
        return product.id;
      })
      .catch(async (error) => {
        // the new file copies belong to nobody now
        for (const uploadId of copiedUploads.values()) {
          await this.uploads.deleteUpload(uploadId).catch(() => undefined);
        }
        return rethrowUnique(error);
      });

    this.cache.delByPrefix('products:');
    return this.findOne(newId);
  }

  // ---------- shared helpers (also used by the variant / image services) ----------

  private pricingFrom(input: Parameters<typeof validatePricing>[0]) {
    validatePricing(input);
    return computePricing(input);
  }

  // Checks the category / sub-category / brand exist and fit together, and
  // returns the denormalized names stored on the product.
  async resolveCatalog(
    categoryId: string,
    subCategoryId?: string,
    brandId?: string,
  ) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });
    if (!category) throw new BadRequestException('Category not found');

    let subCategoryName: string | null = null;
    if (subCategoryId) {
      const sub = await this.prisma.subCategory.findUnique({
        where: { id: subCategoryId },
        select: { name: true, parentCategoryId: true },
      });
      if (!sub) throw new BadRequestException('Sub-category not found');
      if (sub.parentCategoryId !== categoryId) {
        throw new BadRequestException(
          'The sub-category does not belong to this category',
        );
      }
      subCategoryName = sub.name;
    }

    let brandName: string | null = null;
    if (brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: brandId },
        select: { name: true },
      });
      if (!brand) throw new BadRequestException('Brand not found');
      brandName = brand.name;
    }
    return { categoryName: category.name, subCategoryName, brandName };
  }

  // Validates variant input and fills in names; checks SKUs are unique.
  async prepareVariants(
    variants: ProductVariantInputDto[],
    existingProductId?: string,
  ) {
    const seen = new Set<string>();
    const rows = variants.map((v) => {
      const sku = v.sku.trim();
      if (seen.has(sku.toLowerCase())) {
        throw new BadRequestException(
          `SKU "${sku}" is used twice in this request`,
        );
      }
      seen.add(sku.toLowerCase());
      return variantRow(v);
    });
    if (rows.length) {
      const taken = await this.prisma.productVariant.findFirst({
        where: {
          sku: { in: rows.map((r) => r.sku) },
          ...(existingProductId
            ? { NOT: { productId: existingProductId } }
            : {}),
        },
        select: { sku: true },
      });
      if (taken)
        throw new ConflictException(`SKU "${taken.sku}" is already used`);
    }
    return rows;
  }

  async assertExists(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private async assertNameFree(name: string, exceptId?: string) {
    const hit = await this.prisma.product.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (hit)
      throw new ConflictException(`A product named "${name}" already exists`);
  }

  private async assertSlugFree(slug: string, exceptId?: string) {
    const hit = await this.prisma.product.findFirst({
      where: { slug, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
      select: { id: true },
    });
    if (hit) throw new ConflictException(`The slug "${slug}" is already used`);
  }

  private async assertCodeFree(code: string, exceptId?: string) {
    const hit = await this.prisma.product.findFirst({
      where: {
        productCode: code,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (hit)
      throw new ConflictException(`The product code "${code}" is already used`);
  }

  private async freeSlug(base: string) {
    let slug = base;
    for (
      let n = 2;
      await this.prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      });
      n++
    ) {
      slug = `${base}-${n}`;
    }
    return slug;
  }

  private async freeName(base: string) {
    let name = base;
    for (
      let n = 2;
      await this.prisma.product.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      });
      n++
    ) {
      name = `${base} ${n}`;
    }
    return name;
  }
}

export function stockState(
  stock: number,
  threshold: number,
): 'in' | 'low' | 'out' {
  if (stock <= 0) return 'out';
  return stock <= threshold ? 'low' : 'in';
}

export function variantRow(v: ProductVariantInputDto) {
  const parts = [
    v.attribute1Value?.trim(),
    v.attribute2Value?.trim(),
    v.attribute3Value?.trim(),
  ].filter(Boolean);
  const name = v.name?.trim() || parts.join(' / ');
  if (!name) {
    throw new BadRequestException(
      `Variant ${v.sku}: give it a name or at least one attribute value`,
    );
  }
  return {
    name,
    sku: v.sku.trim(),
    barcode: v.barcode ?? null,
    price: v.price ?? null,
    stock: v.stock ?? 0,
    imageUrl: v.imageUrl ?? null,
    attribute1Name: v.attribute1Name?.trim() || null,
    attribute1Value: v.attribute1Value?.trim() || null,
    attribute2Name: v.attribute2Name?.trim() || null,
    attribute2Value: v.attribute2Value?.trim() || null,
    attribute3Name: v.attribute3Name?.trim() || null,
    attribute3Value: v.attribute3Value?.trim() || null,
  };
}

function specCreate(
  specs: { title: string; items: { key: string; value: string }[] }[],
) {
  return specs.map((spec, i) => ({
    title: spec.title,
    displayOrder: i,
    items: {
      create: spec.items.map((item, n) => ({
        key: item.key,
        value: item.value,
        displayOrder: n,
      })),
    },
  }));
}

function parseJsonList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

// Trims and drops blank / repeated tags (case-insensitively).
export function normalizeTags(tags?: string[]): string[] {
  if (!tags) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, ' ');
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
  }
  return out;
}

// Trims attribute names/values and rejects the same name twice (names are
// unique per product, case-insensitively).
function normalizeAttributes(
  attributes?: { name: string; value: string }[],
): { name: string; value: string }[] {
  if (!attributes) return [];
  const clean = attributes.map((a) => ({
    name: a.name.trim().replace(/\s+/g, ' '),
    value: a.value.trim().replace(/\s+/g, ' '),
  }));
  const seen = new Set<string>();
  for (const a of clean) {
    const key = a.name.toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException(`Attribute "${a.name}" is listed twice`);
    }
    seen.add(key);
  }
  return clean;
}

// A race between two admins can still hit the database unique index.
function rethrowUnique(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(', ')
      : 'a unique field';
    throw new ConflictException(`Already in use: ${target}`);
  }
  throw error;
}
