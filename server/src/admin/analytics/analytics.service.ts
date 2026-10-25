import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DateRange, previousRange } from '../../common/export/date-range';

export const GRANULARITIES = ['day', 'week', 'month'] as const;
export type Granularity = (typeof GRANULARITIES)[number];

// What counts as a sale: every order that was not cancelled or refunded in
// full. (Cancelled orders used to be included in the revenue.)
const VALID = Prisma.sql`o.status NOT IN ('CANCELLED', 'REFUNDED')`;

// A JS date as a UTC timestamp, whatever the server time zone is.
const ts = (d: Date) =>
  Prisma.sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;
const inRange = (r: DateRange, col = Prisma.sql`o."placedAt"`) =>
  Prisma.sql`${col} >= ${ts(r.from)} AND ${col} < ${ts(r.to)}`;
// Shop-local (Bangladesh) calendar time of a stored UTC timestamp
const local = (col: Prisma.Sql) =>
  Prisma.sql`((${col} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka')`;

const pct = (cur: number, prev: number) =>
  prev === 0 ? null : Math.round(((cur - prev) / prev) * 1000) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PeriodTotals {
  orders: number;
  revenue: number;
  avgOrderValue: number;
  unitsSold: number;
  customers: number;
  newCustomers: number;
  cancelledOrders: number;
  cancelledValue: number;
  refunds: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private async totals(r: DateRange): Promise<PeriodTotals> {
    const [[o], [u], [ref], newCustomers] = await Promise.all([
      this.prisma.$queryRaw<
        {
          orders: number;
          revenue: number;
          customers: number;
          cancelled: number;
          cancelledValue: number;
        }[]
      >(Prisma.sql`
        SELECT COUNT(*) FILTER (WHERE ${VALID})::int AS orders,
               COALESCE(SUM(o.total) FILTER (WHERE ${VALID}), 0)::float8 AS revenue,
               COUNT(DISTINCT COALESCE(o."userId", o."guestPhone")) FILTER (WHERE ${VALID})::int AS customers,
               COUNT(*) FILTER (WHERE o.status = 'CANCELLED')::int AS cancelled,
               COALESCE(SUM(o.total) FILTER (WHERE o.status = 'CANCELLED'), 0)::float8 AS "cancelledValue"
        FROM "Order" o WHERE ${inRange(r)}`),
      this.prisma.$queryRaw<{ units: number }[]>(Prisma.sql`
        SELECT COALESCE(SUM(i.quantity), 0)::int AS units
        FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
        WHERE ${VALID} AND ${inRange(r)}`),
      this.prisma.$queryRaw<{ refunds: number }[]>(Prisma.sql`
        SELECT COALESCE(SUM(amount), 0)::float8 AS refunds FROM "RefundTransaction"
        WHERE status = 'REFUNDED' AND "processedAt" >= ${ts(r.from)} AND "processedAt" < ${ts(r.to)}`),
      this.prisma.user.count({
        where: { role: 'USER', createdAt: { gte: r.from, lt: r.to } },
      }),
    ]);
    return {
      orders: o.orders,
      revenue: round2(o.revenue),
      avgOrderValue: o.orders ? round2(o.revenue / o.orders) : 0,
      unitsSold: u.units,
      customers: o.customers,
      newCustomers,
      cancelledOrders: o.cancelled,
      cancelledValue: round2(o.cancelledValue),
      refunds: round2(ref.refunds),
    };
  }

  // Numbers for the period, the period right before it, and the change.
  async overview(r: DateRange) {
    const prevRange = previousRange(r);
    const [current, previous, ordersByStatus, pending] = await Promise.all([
      this.totals(r),
      this.totals(prevRange),
      this.prisma.order.groupBy({
        by: ['status'],
        where: { placedAt: { gte: r.from, lt: r.to } },
        _count: true,
      }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
    ]);
    const change: Record<string, number | null> = {};
    for (const k of Object.keys(current) as (keyof PeriodTotals)[]) {
      change[k] = pct(current[k], previous[k]);
    }
    return {
      range: { from: r.from, to: r.to },
      previousRange: prevRange,
      current,
      previous,
      changePercent: change,
      ordersByStatus: ordersByStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      pendingOrdersNow: pending,
      note: 'Revenue counts orders that were not cancelled or fully refunded.',
    };
  }

  async salesSeries(r: DateRange, g: Granularity) {
    const unit = Prisma.raw(`'${g}'`);
    const step = Prisma.raw(`'1 ${g}'`);
    const bucket = (col: Prisma.Sql) =>
      Prisma.sql`date_trunc(${unit}, ${local(col)})`;
    const rows = await this.prisma.$queryRaw<
      {
        period: string;
        orders: number;
        units: number;
        revenue: number;
        discounts: number;
        shipping: number;
      }[]
    >(Prisma.sql`
      WITH b AS (
        SELECT generate_series(
          date_trunc(${unit}, ${local(ts(r.from))}),
          date_trunc(${unit}, ${local(Prisma.sql`(${ts(r.to)} - interval '1 millisecond')`)}),
          ${step}::interval) AS period
      ),
      s AS (
        SELECT ${bucket(Prisma.sql`o."placedAt"`)} AS period,
               COUNT(*)::int AS orders,
               COALESCE(SUM(o.total), 0)::float8 AS revenue,
               COALESCE(SUM(o."discountAmount"), 0)::float8 AS discounts,
               COALESCE(SUM(o."shippingCost"), 0)::float8 AS shipping
        FROM "Order" o WHERE ${VALID} AND ${inRange(r)} GROUP BY 1
      ),
      u AS (
        SELECT ${bucket(Prisma.sql`o."placedAt"`)} AS period, COALESCE(SUM(i.quantity), 0)::int AS units
        FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
        WHERE ${VALID} AND ${inRange(r)} GROUP BY 1
      )
      SELECT to_char(b.period, 'YYYY-MM-DD') AS period,
             COALESCE(s.orders, 0) AS orders, COALESCE(u.units, 0) AS units,
             COALESCE(s.revenue, 0)::float8 AS revenue,
             COALESCE(s.discounts, 0)::float8 AS discounts,
             COALESCE(s.shipping, 0)::float8 AS shipping
      FROM b LEFT JOIN s ON s.period = b.period LEFT JOIN u ON u.period = b.period
      ORDER BY b.period`);
    return rows.map((x) => ({
      ...x,
      revenue: round2(x.revenue),
      discounts: round2(x.discounts),
      shipping: round2(x.shipping),
      avgOrderValue: x.orders ? round2(x.revenue / x.orders) : 0,
    }));
  }

  async newCustomersSeries(r: DateRange, g: Granularity) {
    const unit = Prisma.raw(`'${g}'`);
    const step = Prisma.raw(`'1 ${g}'`);
    return this.prisma.$queryRaw<
      { period: string; customers: number }[]
    >(Prisma.sql`
      WITH b AS (
        SELECT generate_series(
          date_trunc(${unit}, ${local(ts(r.from))}),
          date_trunc(${unit}, ${local(Prisma.sql`(${ts(r.to)} - interval '1 millisecond')`)}),
          ${step}::interval) AS period
      ),
      c AS (
        SELECT date_trunc(${unit}, ${local(Prisma.sql`u."createdAt"`)}) AS period, COUNT(*)::int AS customers
        FROM "User" u
        WHERE u.role = 'USER' AND u."createdAt" >= ${ts(r.from)} AND u."createdAt" < ${ts(r.to)}
        GROUP BY 1
      )
      SELECT to_char(b.period, 'YYYY-MM-DD') AS period, COALESCE(c.customers, 0)::int AS customers
      FROM b LEFT JOIN c ON c.period = b.period ORDER BY b.period`);
  }

  async topProducts(r: DateRange, by: 'revenue' | 'units', limit: number) {
    const order =
      by === 'units'
        ? Prisma.sql`units DESC, revenue DESC`
        : Prisma.sql`revenue DESC, units DESC`;
    const rows = await this.prisma.$queryRaw<
      {
        productId: string;
        name: string;
        units: number;
        revenue: number;
        orders: number;
      }[]
    >(Prisma.sql`
      SELECT i."productId", MAX(i."productName") AS name,
             SUM(i.quantity)::int AS units, SUM(i.total)::float8 AS revenue,
             COUNT(DISTINCT i."orderId")::int AS orders
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
      WHERE ${VALID} AND ${inRange(r)}
      GROUP BY i."productId" ORDER BY ${order} LIMIT ${limit}`);
    const products = await this.prisma.product.findMany({
      where: { id: { in: rows.map((x) => x.productId) } },
      select: {
        id: true,
        slug: true,
        stock: true,
        status: true,
        images: { where: { isMain: true }, take: 1, select: { url: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return rows.map((x) => ({
      ...x,
      revenue: round2(x.revenue),
      slug: byId.get(x.productId)?.slug ?? null,
      image: byId.get(x.productId)?.images[0]?.url ?? null,
      stock: byId.get(x.productId)?.stock ?? null,
    }));
  }

  async topCategories(r: DateRange, limit: number) {
    const rows = await this.prisma.$queryRaw<
      {
        categoryId: string;
        name: string;
        units: number;
        revenue: number;
        orders: number;
      }[]
    >(Prisma.sql`
      SELECT p."categoryId", COALESCE(c.name, 'Unknown') AS name,
             SUM(i.quantity)::int AS units, SUM(i.total)::float8 AS revenue,
             COUNT(DISTINCT i."orderId")::int AS orders
      FROM "OrderItem" i
      JOIN "Order" o ON o.id = i."orderId"
      JOIN "Product" p ON p.id = i."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE ${VALID} AND ${inRange(r)}
      GROUP BY p."categoryId", c.name ORDER BY revenue DESC LIMIT ${limit}`);
    const total = rows.reduce((s, x) => s + x.revenue, 0);
    return rows.map((x) => ({
      ...x,
      revenue: round2(x.revenue),
      sharePercent: total ? round2((x.revenue / total) * 100) : 0,
    }));
  }

  private async breakdown(r: DateRange, column: Prisma.Sql, fallback: string) {
    const rows = await this.prisma.$queryRaw<
      { key: string; orders: number; revenue: number }[]
    >(Prisma.sql`
      SELECT COALESCE(${column}::text, ${fallback}) AS key, COUNT(*)::int AS orders,
             COALESCE(SUM(o.total), 0)::float8 AS revenue
      FROM "Order" o WHERE ${VALID} AND ${inRange(r)}
      GROUP BY 1 ORDER BY revenue DESC`);
    const total = rows.reduce((s, x) => s + x.revenue, 0);
    return rows.map((x) => ({
      key: x.key,
      orders: x.orders,
      revenue: round2(x.revenue),
      avgOrderValue: x.orders ? round2(x.revenue / x.orders) : 0,
      sharePercent: total ? round2((x.revenue / total) * 100) : 0,
    }));
  }

  revenueByPaymentMethod(r: DateRange) {
    return this.breakdown(r, Prisma.sql`o."paymentMethod"`, 'UNKNOWN');
  }

  revenueByZone(r: DateRange) {
    return this.breakdown(r, Prisma.sql`o."shippingZone"`, 'UNKNOWN');
  }

  revenueBySource(r: DateRange) {
    return this.breakdown(r, Prisma.sql`o.source`, 'WEB');
  }
}
