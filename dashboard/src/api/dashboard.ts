import { api, clean } from "./client";

export type Granularity = "day" | "week" | "month";
export interface RangeParams {
  from?: string;
  to?: string;
  granularity?: Granularity;
}

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
export interface Overview {
  range: { from: string; to: string };
  current: PeriodTotals;
  previous: PeriodTotals;
  changePercent: Record<keyof PeriodTotals, number | null>;
  ordersByStatus: { status: string; count: number }[];
  pendingOrdersNow: number;
}
export interface SalesPoint {
  period: string;
  orders: number;
  units: number;
  revenue: number;
  discounts: number;
  shipping: number;
  avgOrderValue: number;
}
export interface TopProduct {
  productId: string;
  name: string;
  slug: string | null;
  image: string | null;
  units: number;
  revenue: number;
  orders: number;
  stock: number | null;
}
export interface TopCategory {
  categoryId: string;
  name: string;
  units: number;
  revenue: number;
  orders: number;
  sharePercent: number;
}
export interface Breakdown {
  key: string;
  orders: number;
  revenue: number;
  avgOrderValue: number;
  sharePercent: number;
}
export interface InventoryRow {
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
  state: "in" | "low" | "out";
}
export interface AnalyticsBundle {
  range: { from: string; to: string };
  granularity: Granularity;
  overview: Overview;
  sales: SalesPoint[];
  topProducts: TopProduct[];
  topCategories: TopCategory[];
  revenueByPaymentMethod: Breakdown[];
  revenueByZone: Breakdown[];
  newCustomers: { period: string; customers: number }[];
  lowStock: InventoryRow[];
}
export interface DashboardHome {
  overview: {
    totalProducts: number;
    totalOrders: number;
    totalUsers: number;
    totalRevenue: number;
    todayOrders: number;
    todayRevenue: number;
    pendingOrders: number;
    lowStockProducts: number;
    outOfStockProducts: number;
  };
  ordersByStatus: { status: string; count: number }[];
  lowStock: InventoryRow[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string;
    total: string;
    placedAt: string;
    guestName: string | null;
    user: { id: string; name: string; email: string } | null;
    items: { productName: string }[];
  }[];
}

export const dashboardApi = {
  home: () => api.get<DashboardHome>("/admin/dashboard").then((r) => r.data),
  analytics: (p: RangeParams) => api.get<AnalyticsBundle>("/admin/dashboard/analytics", { params: clean({ ...p }) }).then((r) => r.data),
};
