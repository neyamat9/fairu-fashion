import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { resolveRange } from '../../common/export/date-range';
import { AnalyticsService } from '../analytics/analytics.service';
import { InventoryService } from '../inventory/inventory.service';
import { DashboardService } from './dashboard.service';
import {
  LimitQueryDto,
  RangeQueryDto,
  SeriesQueryDto,
  TopQueryDto,
  autoGranularity,
} from './dashboard.dto';

const RANGE_NOTE =
  ' Use from / to (2026-09-01 = that Bangladesh day; `to` includes its whole day). Default: last 30 days.';

@ApiTags('Admin - Dashboard & Analytics')
@ApiBearerAuth('JWT')
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly analytics: AnalyticsService,
    private readonly inventory: InventoryService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Dashboard home: totals, today, orders by status, low stock, latest orders (cancelled/refunded orders are not counted as revenue)',
  })
  getStats() {
    return this.dashboard.getStats();
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Everything for the analytics page in one call.' + RANGE_NOTE,
  })
  bundle(@Query() q: SeriesQueryDto) {
    return this.dashboard.analyticsBundle(q.from, q.to, q.granularity);
  }

  @Get('overview')
  @ApiOperation({
    summary:
      'Orders, revenue, average order, units, customers, new customers, cancellations, refunds, each compared with the previous period.' +
      RANGE_NOTE,
  })
  overview(@Query() q: RangeQueryDto) {
    return this.analytics.overview(resolveRange(q.from, q.to));
  }

  @Get('sales')
  @ApiOperation({
    summary:
      'Sales over time per day / week / month (empty periods included as zero).' +
      RANGE_NOTE,
  })
  async sales(@Query() q: SeriesQueryDto) {
    const r = resolveRange(q.from, q.to);
    const g = q.granularity ?? autoGranularity(r.from, r.to);
    return {
      range: { from: r.from, to: r.to },
      granularity: g,
      series: await this.analytics.salesSeries(r, g),
    };
  }

  @Get('top-products')
  @ApiOperation({
    summary: 'Best-selling products by revenue or units.' + RANGE_NOTE,
  })
  topProducts(@Query() q: TopQueryDto) {
    return this.analytics.topProducts(
      resolveRange(q.from, q.to),
      q.by,
      q.limit,
    );
  }

  @Get('top-categories')
  @ApiOperation({
    summary:
      'Best-selling categories with their share of revenue.' + RANGE_NOTE,
  })
  topCategories(@Query() q: TopQueryDto) {
    return this.analytics.topCategories(resolveRange(q.from, q.to), q.limit);
  }

  @Get('revenue-by-payment-method')
  @ApiOperation({
    summary: 'Revenue split between Cash on Delivery and bKash.' + RANGE_NOTE,
  })
  byMethod(@Query() q: RangeQueryDto) {
    return this.analytics.revenueByPaymentMethod(resolveRange(q.from, q.to));
  }

  @Get('revenue-by-zone')
  @ApiOperation({
    summary:
      'Revenue split between inside Dhaka, outside Dhaka (or global).' +
      RANGE_NOTE,
  })
  byZone(@Query() q: RangeQueryDto) {
    return this.analytics.revenueByZone(resolveRange(q.from, q.to));
  }

  @Get('revenue-by-source')
  @ApiOperation({
    summary:
      'Revenue split between website orders and phone orders created by the shop.' +
      RANGE_NOTE,
  })
  bySource(@Query() q: RangeQueryDto) {
    return this.analytics.revenueBySource(resolveRange(q.from, q.to));
  }

  @Get('new-customers')
  @ApiOperation({
    summary: 'New customer registrations per day / week / month.' + RANGE_NOTE,
  })
  async newCustomers(@Query() q: SeriesQueryDto) {
    const r = resolveRange(q.from, q.to);
    const g = q.granularity ?? autoGranularity(r.from, r.to);
    const series = await this.analytics.newCustomersSeries(r, g);
    return {
      range: { from: r.from, to: r.to },
      granularity: g,
      total: series.reduce((s, x) => s + x.customers, 0),
      series,
    };
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'Items at or below their low-stock level, lowest first',
  })
  lowStock(@Query() q: LimitQueryDto) {
    return this.inventory.items({ state: 'low', page: 1, limit: q.limit });
  }
}
