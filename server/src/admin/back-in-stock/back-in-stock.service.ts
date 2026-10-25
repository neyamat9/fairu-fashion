import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BackInStockAlertService } from '../../common/back-in-stock';
import {
  NotifyNowDto,
  RequestsListDto,
  WaitingListDto,
} from './back-in-stock.dto';

@Injectable()
export class AdminBackInStockService {
  constructor(
    private prisma: PrismaService,
    private alerts: BackInStockAlertService,
  ) {}

  async summary() {
    const [row] = await this.prisma.$queryRaw<
      { waiting: number; items: number; ready: number; stuck: number }[]
    >(Prisma.sql`
      SELECT COUNT(*)::int AS waiting,
             COUNT(DISTINCT (s."productId", s."variantKey"))::int AS items,
             COUNT(*) FILTER (WHERE COALESCE(v.stock, p.stock) > 0 AND p.status = 'ACTIVE')::int AS ready,
             COUNT(*) FILTER (WHERE s.attempts >= 3)::int AS stuck
      FROM "BackInStockSubscription" s
      JOIN "Product" p ON p.id = s."productId"
      LEFT JOIN "ProductVariant" v ON v.id = s."variantId"
      WHERE s.notified = false`);
    return {
      waitingRequests: row.waiting,
      waitingItems: row.items,
      readyToAlert: row.ready,
      failedAfterRetries: row.stuck,
    };
  }

  // One line per item customers are waiting for.
  async waitingList(q: WaitingListDto) {
    const filters: Prisma.Sql[] = [Prisma.sql`s.notified = false`];
    if (q.search) {
      const like = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      filters.push(
        Prisma.sql`(p.name ILIKE ${like} OR v.name ILIKE ${like} OR v.sku ILIKE ${like})`,
      );
    }
    const having =
      q.inStockNow === undefined
        ? Prisma.empty
        : q.inStockNow
          ? Prisma.sql`HAVING COALESCE(MAX(v.stock), MAX(p.stock)) > 0`
          : Prisma.sql`HAVING COALESCE(MAX(v.stock), MAX(p.stock)) <= 0`;
    const where = Prisma.join(filters, ' AND ');
    const base = Prisma.sql`
      FROM "BackInStockSubscription" s
      JOIN "Product" p ON p.id = s."productId"
      LEFT JOIN "ProductVariant" v ON v.id = s."variantId"
      WHERE ${where}
      GROUP BY s."productId", s."variantId", p.id, v.id`;
    const [data, count] = await Promise.all([
      this.prisma.$queryRaw<
        {
          productId: string;
          variantId: string | null;
          productName: string;
          variantName: string | null;
          sku: string | null;
          status: string;
          stock: number;
          waiting: number;
          failed: number;
          oldest: Date;
        }[]
      >(Prisma.sql`
        SELECT s."productId", s."variantId", p.name AS "productName", v.name AS "variantName", v.sku,
               p.status::text AS status, COALESCE(v.stock, p.stock)::int AS stock,
               COUNT(*)::int AS waiting, COUNT(*) FILTER (WHERE s.attempts >= 3)::int AS failed,
               MIN(s."createdAt") AS oldest
        ${base} ${having}
        ORDER BY waiting DESC, oldest ASC
        LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`),
      this.prisma.$queryRaw<{ n: number }[]>(Prisma.sql`
        SELECT COUNT(*)::int AS n FROM (SELECT 1 ${base} ${having}) t`),
    ]);
    const total = count[0]?.n ?? 0;
    return {
      data: data.map((r) => ({
        ...r,
        readyToAlert: r.stock > 0 && r.status === 'ACTIVE',
      })),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  async requests(q: RequestsListDto) {
    const where: Prisma.BackInStockSubscriptionWhereInput = {
      ...(q.productId ? { productId: q.productId } : {}),
      ...(q.variantId ? { variantId: q.variantId } : {}),
      ...(q.notified === undefined ? {} : { notified: q.notified }),
      ...(q.email ? { email: { contains: q.email.toLowerCase() } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.backInStockSubscription.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: { product: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.backInStockSubscription.count({ where }),
    ]);
    return {
      // the cancel token belongs to the customer's email: never shown here
      data: rows.map(({ cancelToken, ...r }) => {
        void cancelToken;
        return r;
      }),
      meta: {
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
      },
    };
  }

  // Send the alerts for one item now (instead of waiting for the next run).
  async notifyNow(dto: NotifyNowDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: {
        id: true,
        status: true,
        stock: true,
        _count: { select: { variants: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    let stock = product.stock;
    if (product._count.variants > 0) {
      if (!dto.variantId) throw new BadRequestException('Choose a variant');
      const v = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: product.id },
        select: { stock: true },
      });
      if (!v)
        throw new BadRequestException(
          'That variant does not belong to this product',
        );
      stock = v.stock;
    }
    if (stock <= 0)
      throw new BadRequestException(
        'This item is still out of stock: add stock first',
      );
    if (product.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Activate the product first: alerts are only sent for products on sale',
      );
    }
    // allow another try for requests that failed before
    await this.prisma.backInStockSubscription.updateMany({
      where: {
        productId: dto.productId,
        variantKey: dto.variantId ?? '',
        notified: false,
        attempts: { gte: 3 },
      },
      data: { attempts: 0, lastError: null },
    });
    const result = await this.alerts.sendDue({
      productId: dto.productId,
      variantId: dto.variantId ?? null,
    });
    if (result.emailNotConfigured) {
      throw new BadRequestException(
        'Email is not set up (Admin → Settings → Email). The requests are still waiting.',
      );
    }
    return result;
  }

  async remove(id: string) {
    const r = await this.prisma.backInStockSubscription.deleteMany({
      where: { id },
    });
    if (r.count === 0) throw new NotFoundException('Request not found');
    return { success: true };
  }
}
