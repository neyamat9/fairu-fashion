import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveRange } from '../../common/export/date-range';
import { AnalyticsService, Granularity } from '../analytics/analytics.service';
import { InventoryService } from '../inventory/inventory.service';
import { autoGranularity } from './dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private analytics: AnalyticsService,
    private inventory: InventoryService,
  ) {}

  // The dashboard home: today + all-time numbers, status counts, low stock
  // and the latest orders. Revenue never counts cancelled/refunded orders.
  async getStats() {
    const dayMs = 24 * 60 * 60 * 1000;
    // "Today" in Bangladesh time (UTC+6)
    const localNow = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const startOfToday = new Date(
      Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
      ) -
        6 * 60 * 60 * 1000,
    );
    const validOrder = {
      status: {
        notIn: ['CANCELLED', 'REFUNDED'] as ('CANCELLED' | 'REFUNDED')[],
      },
    };

    const [
      totalProducts,
      totalOrders,
      totalUsers,
      revenue,
      todayOrders,
      todayRevenue,
      pendingOrders,
      stock,
      ordersByStatus,
      recentOrders,
      lowStock,
    ] = await Promise.all([
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count({ where: validOrder }),
      this.prisma.user.count({ where: { status: 'ACTIVE', role: 'USER' } }),
      this.prisma.order.aggregate({ where: validOrder, _sum: { total: true } }),
      this.prisma.order.count({
        where: {
          ...validOrder,
          placedAt: {
            gte: startOfToday,
            lt: new Date(startOfToday.getTime() + dayMs),
          },
        },
      }),
      this.prisma.order.aggregate({
        where: { ...validOrder, placedAt: { gte: startOfToday } },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.inventory.summary(),
      this.prisma.order.groupBy({ by: ['status'], _count: true }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { placedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { take: 1 },
        },
      }),
      this.inventory.items({ state: 'low', page: 1, limit: 10 }),
    ]);

    return {
      overview: {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: Number(revenue._sum.total ?? 0),
        todayOrders,
        todayRevenue: Number(todayRevenue._sum.total ?? 0),
        pendingOrders,
        lowStockProducts: stock.lowStock,
        outOfStockProducts: stock.outOfStock,
      },
      ordersByStatus: ordersByStatus.map((o) => ({
        status: o.status,
        count: o._count,
      })),
      lowStock: lowStock.data,
      recentOrders,
      note: 'Revenue and order counts exclude cancelled and fully refunded orders.',
    };
  }

  // Everything the analytics page needs in one call.
  async analyticsBundle(from?: string, to?: string, granularity?: Granularity) {
    const r = resolveRange(from, to);
    const g = granularity ?? autoGranularity(r.from, r.to);
    const [
      overview,
      sales,
      topProducts,
      topCategories,
      byMethod,
      byZone,
      newCustomers,
      lowStock,
    ] = await Promise.all([
      this.analytics.overview(r),
      this.analytics.salesSeries(r, g),
      this.analytics.topProducts(r, 'revenue', 10),
      this.analytics.topCategories(r, 10),
      this.analytics.revenueByPaymentMethod(r),
      this.analytics.revenueByZone(r),
      this.analytics.newCustomersSeries(r, g),
      this.inventory.items({ state: 'low', page: 1, limit: 10 }),
    ]);
    return {
      range: { from: r.from, to: r.to },
      granularity: g,
      overview,
      sales,
      topProducts,
      topCategories,
      revenueByPaymentMethod: byMethod,
      revenueByZone: byZone,
      newCustomers,
      lowStock: lowStock.data,
    };
  }
}
