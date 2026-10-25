import { api, clean, type Paged } from "./client";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: string;
  discountType: DiscountType;
  discountValue: string;
  minOrderAmount: string | null;
  maxDiscount: string | null;
  maxUsageCount: number | null;
  maxUsagePerUser: number | null;
  usageCount: number;
  isActive: boolean;
  validFrom: string;
  validTo: string;
  appliesToAllProducts: boolean;
  applicableCategories: string[] | null;
  applicableProducts: string[] | null;
  applicableUsers: string[] | null;
  firstOrderOnly: boolean;
  state: "active" | "scheduled" | "expired" | "inactive" | "used-up";
}
export interface CouponInput {
  code?: string;
  description?: string;
  discountType?: DiscountType;
  discountValue?: number;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  maxUsageCount?: number | null;
  maxUsagePerUser?: number | null;
  isActive?: boolean;
  validFrom?: string;
  validTo?: string;
  appliesToAllProducts?: boolean;
  applicableCategories?: string[] | null;
  applicableProducts?: string[] | null;
  firstOrderOnly?: boolean;
}
export interface CouponUsageReport<T> {
  coupon: { code: string; state: string; discountType: string; discountValue: number; maxUsageCount: number | null };
  summary: { uses: number; remainingUses: number | null; totalDiscountGiven: number; uniqueCustomers: number; orderRevenue: number };
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
export interface UsageRow {
  id: string;
  usedAt: string;
  customer: { id?: string; name?: string; email?: string; guestPhone?: string } | null;
  order: { id: string; orderNumber?: string; total?: string; status?: string } | null;
  discountAmount: number;
}
export interface UserUsageRow {
  customer: { id?: string; name?: string; email?: string; guestPhone?: string } | null;
  uses: number;
  discount: number;
  lastUsedAt: string;
}
export interface BulkResult {
  count: number;
  description: string;
  codes: string[];
}

export const couponsApi = {
  list: (f: Record<string, unknown>) => api.get<Paged<Coupon>>("/admin/coupons", { params: clean(f) }).then((r) => r.data),
  get: (id: string) => api.get<Coupon>(`/admin/coupons/${id}`).then((r) => r.data),
  create: (b: CouponInput) => api.post<Coupon>("/admin/coupons", b).then((r) => r.data),
  update: (id: string, b: CouponInput) => api.patch<Coupon>(`/admin/coupons/${id}`, b).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/coupons/${id}`).then((r) => r.data),
  usage: (id: string, page: number) => api.get<CouponUsageReport<UsageRow>>(`/admin/coupons/${id}/usage`, { params: { page, limit: 20 } }).then((r) => r.data),
  users: (id: string, page: number) => api.get<CouponUsageReport<UserUsageRow>>(`/admin/coupons/${id}/users`, { params: { page, limit: 20 } }).then((r) => r.data),
  bulk: (b: Record<string, unknown>) => api.post<BulkResult>("/admin/coupons/bulk-generate", { ...b, format: "json" }).then((r) => r.data),
};
