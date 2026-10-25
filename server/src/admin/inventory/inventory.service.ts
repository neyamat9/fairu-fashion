import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache';
import { StockService } from '../../common/inventory';
import { CsvParseResult, parseCsv } from '../../common/utils/csv';
import {
  AdjustStockDto,
  InventoryListDto,
  StockLogQueryDto,
} from './dto/inventory.dto';

export const MAX_BULK_ROWS = 5000;

export interface SkuRow {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  status: string;
  stock: number;
  threshold: number;
  cost: string;
  retail: string;
}

// One row per sellable unit: a product without variants, or each variant.
export const SKU_ROWS = Prisma.sql`
  SELECT p.id AS "productId", NULL::text AS "variantId", p.name AS "productName",
         NULL::text AS "variantName", p."productCode" AS sku, p.status::text AS status,
         p.stock, p."lowStockThreshold" AS threshold,
         p."buyingPrice"::text AS cost, p."sellingPrice"::text AS retail
  FROM "Product" p
  WHERE NOT EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id)
  UNION ALL
  SELECT p.id, v.id, p.name, v.name, v.sku, p.status::text,
         v.stock, p."lowStockThreshold",
         p."buyingPrice"::text, COALESCE(v.price, p."sellingPrice")::text
  FROM "ProductVariant" v JOIN "Product" p ON p.id = v."productId"`;

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private stock: StockService,
    private cache: CacheService,
  ) {}

  async summary() {
    const [row] = await this.prisma.$queryRaw<
      {
        items: bigint;
        inStock: bigint;
        low: bigint;
        out: bigint;
        units: bigint | null;
        costValue: string | null;
        retailValue: string | null;
      }[]
    >(Prisma.sql`
      SELECT COUNT(*) AS items,
             COUNT(*) FILTER (WHERE stock > threshold) AS "inStock",
             COUNT(*) FILTER (WHERE stock > 0 AND stock <= threshold) AS low,
             COUNT(*) FILTER (WHERE stock <= 0) AS out,
             SUM(GREATEST(stock, 0)) AS units,
             SUM(GREATEST(stock, 0) * cost::numeric)::text AS "costValue",
             SUM(GREATEST(stock, 0) * retail::numeric)::text AS "retailValue"
      FROM (${SKU_ROWS}) s
      WHERE status NOT IN ('DISCONTINUED')`);
    return {
      skuCount: Number(row.items),
      inStock: Number(row.inStock),
      lowStock: Number(row.low),
      outOfStock: Number(row.out),
      unitsOnHand: Number(row.units ?? 0),
      stockValueAtCost: Number(row.costValue ?? 0),
      stockValueAtRetail: Number(row.retailValue ?? 0),
    };
  }

  private filter(q: Pick<InventoryListDto, 'search' | 'state'>) {
    const parts: Prisma.Sql[] = [Prisma.sql`status NOT IN ('DISCONTINUED')`];
    if (q.state === 'out') parts.push(Prisma.sql`stock <= 0`);
    if (q.state === 'low')
      parts.push(Prisma.sql`stock > 0 AND stock <= threshold`);
    if (q.search) {
      const like = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      parts.push(
        Prisma.sql`("productName" ILIKE ${like} OR "variantName" ILIKE ${like} OR sku ILIKE ${like})`,
      );
    }
    return Prisma.join(parts, ' AND ');
  }

  async items(q: InventoryListDto) {
    const where = this.filter(q);
    const [data, [count]] = await Promise.all([
      this.prisma.$queryRaw<SkuRow[]>(Prisma.sql`
        SELECT * FROM (${SKU_ROWS}) s WHERE ${where}
        ORDER BY stock ASC, "productName" ASC, "variantName" ASC NULLS FIRST
        LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`),
      this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total FROM (${SKU_ROWS}) s WHERE ${where}`,
      ),
    ]);
    const total = Number(count.total);
    return {
      data: data.map((r) => ({
        ...r,
        state: r.stock <= 0 ? 'out' : r.stock <= r.threshold ? 'low' : 'in',
      })),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  // Every unit, for the CSV download (streamed in chunks by the controller).
  async exportRows(offset: number, take: number) {
    return this.prisma.$queryRaw<SkuRow[]>(Prisma.sql`
      SELECT * FROM (${SKU_ROWS}) s WHERE status NOT IN ('DISCONTINUED')
      ORDER BY "productName" ASC, "variantName" ASC NULLS FIRST, "variantId" ASC NULLS FIRST
      LIMIT ${take} OFFSET ${offset}`);
  }

  async adjust(dto: AdjustStockDto, adminId: string) {
    if (dto.mode !== 'SET' && dto.quantity === 0) {
      throw new BadRequestException('Quantity must be at least 1');
    }
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true, _count: { select: { variants: true } } },
    });
    if (!product) throw new BadRequestException('Product not found');
    if (product._count.variants > 0 && !dto.variantId) {
      throw new BadRequestException(
        'This product has variants: choose which variant to adjust',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const base = {
        productId: dto.productId,
        variantId: dto.variantId,
        reason: dto.reason,
        note: dto.note,
        adminId,
      };
      if (dto.mode === 'SET') {
        const r = await this.stock.setTo(tx, {
          ...base,
          quantity: dto.quantity,
        });
        return (
          r ?? {
            productId: dto.productId,
            variantId: dto.variantId ?? null,
            before: null,
            after: null,
          }
        );
      }
      return this.stock.change(tx, {
        ...base,
        change: dto.mode === 'ADD' ? dto.quantity : -dto.quantity,
      });
    });
    this.cache.delByPrefix('products:');
    return result.before === null
      ? { changed: false, message: 'Stock already has that quantity' }
      : { changed: true, ...result };
  }

  async logs(q: StockLogQueryDto) {
    const where: Prisma.StockLogWhereInput = {
      ...(q.productId ? { productId: q.productId } : {}),
      ...(q.variantId ? { variantId: q.variantId } : {}),
      ...(q.reason ? { reason: q.reason } : {}),
      ...((q.from || q.to) && {
        createdAt: {
          ...(q.from ? { gte: q.from } : {}),
          ...(q.to ? { lte: q.to } : {}),
        },
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.stockLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, name: true, sku: true } },
          admin: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.stockLog.count({ where }),
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

  // CSV columns: sku, stock (or quantity), optional note. "sku" is a variant
  // SKU or a product code. Each row is applied on its own, so one bad row
  // does not block the rest; the answer lists what happened to every row.
  async bulkUpdate(
    csv: string,
    mode: 'set' | 'add',
    dryRun: boolean,
    adminId: string,
  ) {
    let parsed: CsvParseResult;
    try {
      parsed = parseCsv(csv);
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Invalid CSV',
      );
    }
    const qtyCol = ['stock', 'quantity', 'qty'].find((c) =>
      parsed.header.includes(c),
    );
    if (!parsed.header.includes('sku') || !qtyCol) {
      throw new BadRequestException(
        'The CSV needs the columns "sku" and "stock" (or "quantity")',
      );
    }
    if (!parsed.rows.length)
      throw new BadRequestException('The CSV has no rows');
    if (parsed.rows.length > MAX_BULK_ROWS) {
      throw new BadRequestException(`At most ${MAX_BULK_ROWS} rows per file`);
    }

    const results: {
      line: number;
      sku: string;
      status: 'updated' | 'unchanged' | 'error';
      before?: number;
      after?: number;
      error?: string;
    }[] = [];
    const seen = new Set<string>();

    for (const [i, row] of parsed.rows.entries()) {
      const line = i + 2;
      const sku = row['sku'] ?? '';
      const fail = (error: string) =>
        results.push({ line, sku, status: 'error', error });

      if (!sku) {
        fail('sku is empty');
        continue;
      }
      if (seen.has(sku.toLowerCase())) {
        fail('sku appears twice in the file');
        continue;
      }
      seen.add(sku.toLowerCase());

      const raw = row[qtyCol] ?? '';
      if (!/^\d{1,7}$/.test(raw)) {
        fail(`"${raw}" is not a whole number of 0 or more`);
        continue;
      }
      const qty = Number(raw);
      if (mode === 'add' && qty === 0) {
        fail('quantity to add must be at least 1');
        continue;
      }

      const target = await this.findBySku(sku);
      if (target === 'ambiguous') {
        fail('this code matches several items');
        continue;
      }
      if (!target) {
        fail('no variant SKU or product code matches');
        continue;
      }
      if (target.hasVariants) {
        fail('this product has variants: use a variant SKU');
        continue;
      }

      const before = target.stock;
      const after = mode === 'add' ? before + qty : qty;
      if (after === before) {
        results.push({ line, sku, status: 'unchanged', before, after });
        continue;
      }
      if (dryRun) {
        results.push({ line, sku, status: 'updated', before, after });
        continue;
      }

      try {
        await this.prisma.$transaction((tx) =>
          this.stock.change(tx, {
            productId: target.productId,
            variantId: target.variantId,
            change: after - before,
            reason: mode === 'add' ? 'RESTOCK' : 'ADJUSTMENT',
            note: row['note'] || 'Bulk CSV update',
            adminId,
          }),
        );
        results.push({ line, sku, status: 'updated', before, after });
      } catch (e) {
        fail(e instanceof Error ? e.message : 'failed');
      }
    }

    if (!dryRun) this.cache.delByPrefix('products:');
    const count = (s: string) => results.filter((r) => r.status === s).length;
    return {
      dryRun,
      mode,
      total: results.length,
      updated: count('updated'),
      unchanged: count('unchanged'),
      errors: count('error'),
      results,
    };
  }

  private async findBySku(sku: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { sku: { equals: sku, mode: 'insensitive' } },
      select: { id: true, productId: true, stock: true },
      take: 2,
    });
    if (variants.length > 1) return 'ambiguous' as const;
    if (variants[0]) {
      return {
        productId: variants[0].productId,
        variantId: variants[0].id,
        stock: variants[0].stock,
        hasVariants: false,
      };
    }
    const products = await this.prisma.product.findMany({
      where: { productCode: { equals: sku, mode: 'insensitive' } },
      select: { id: true, stock: true, _count: { select: { variants: true } } },
      take: 2,
    });
    if (products.length > 1) return 'ambiguous' as const;
    const p = products[0];
    return p
      ? {
          productId: p.id,
          variantId: null,
          stock: p.stock,
          hasVariants: p._count.variants > 0,
        }
      : null;
  }
}
