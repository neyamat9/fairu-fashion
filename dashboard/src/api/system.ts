import { api, clean, type Paged } from "./client";

// ---------- reports ----------
export interface ReportTable {
  title: string;
  meta?: Record<string, unknown>;
  columns: { key: string; header: string; type?: "text" | "int" | "number" | "money" | "percent" | "date" }[];
  rows: Record<string, unknown>[];
  totals?: Record<string, unknown>;
}
export const REPORTS = [
  { id: "sales", label: "Sales", hint: "Orders and revenue over time", path: "/admin/reports/sales", range: true, gran: true },
  { id: "products", label: "Product performance", hint: "Units, revenue and profit per product", path: "/admin/reports/product-performance", range: true },
  { id: "stock", label: "Stock valuation", hint: "What your stock on hand is worth", path: "/admin/reports/stock-valuation", range: false },
  { id: "coupons", label: "Coupon performance", hint: "Uses and discount per coupon", path: "/admin/reports/coupon-performance", range: true },
  { id: "customers", label: "Customers", hint: "Who ordered and how much they spent", path: "/admin/reports/customers", range: true },
] as const;
export const reportsApi = {
  run: (path: string, params: Record<string, unknown>) => api.get<ReportTable>(path, { params: clean({ ...params, format: "json" }) }).then((r) => r.data),
};

export interface CraftedProductItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  categoryTag?: string;
  bgGradient?: string;
}

export interface CraftedSectionSettings {
  title?: string;
  subtitle?: string;
  items: CraftedProductItem[];
}

// ---------- settings ----------
export interface Settings {
  site: {
    storeName: string; tagline: string; logoUrl: string | null; faviconUrl: string | null; contactEmail: string | null; hotline: string | null; whatsapp: string | null; address: string | null; businessHours: string | null; currency: string; currencySymbol: string; metaTitle: string | null; metaDescription: string | null; socialLinks: Record<string, string>;
    heroBgUrl?: string | null; heroModels?: string[]; heroBadge?: string | null; heroTitle?: string | null; heroHighlight?: string | null; heroDescription?: string | null; heroButtonText?: string | null; heroButtonLink?: string | null; heroIntervalSeconds?: number;
    craftedSection?: CraftedSectionSettings;
  };
  payment: { codEnabled: boolean; bkashEnabled: boolean; bkashNumber: string | null; bkashAccountType: "personal" | "merchant" | "agent"; bkashInstructions: string | null; nagadEnabled: boolean; nagadNumber: string | null; nagadAccountType: "personal" | "merchant" | "agent"; nagadInstructions: string | null; rocketEnabled: boolean; rocketNumber: string | null; rocketAccountType: "personal" | "merchant" | "agent"; rocketInstructions: string | null };
  shipping: { mode: "GLOBAL" | "ZONE"; globalRate: number; globalMinDays: number; globalMaxDays: number; insideDhakaRate: number; insideDhakaMinDays: number; insideDhakaMaxDays: number; outsideDhakaRate: number; outsideDhakaMinDays: number; outsideDhakaMaxDays: number; insideDhakaCities: string[]; freeShippingThreshold: number | null };
  returns: { returnsEnabled: boolean; returnWindowDays: number; policyText: string | null };
  email: {
    provider: "none" | "smtp" | "resend"; fromName: string; fromEmail: string; replyTo: string | null; smtpHost: string | null; smtpPort: number | null; smtpSecure: boolean; smtpUser: string | null; smtpPassSet: boolean; resendApiKeySet: boolean;
    adminNotificationEmail: string | null; notifyCustomerOrderPlaced: boolean; notifyCustomerOrderStatus: boolean; notifyAdminNewOrder: boolean; notifyAdminContactMessage: boolean; notifyAdminSupportTicket: boolean; notifyCustomerTicketReply: boolean; sendNewsletterWelcome: boolean;
  };
}
export type SettingsGroup = keyof Settings;
export const settingsApi = {
  get: () => api.get<Settings>("/admin/settings").then((r) => r.data),
  save: (group: SettingsGroup, body: Record<string, unknown>) => api.put<Record<string, unknown>>(`/admin/settings/${group}`, body).then((r) => r.data),
  testEmail: (to: string, overrides: Record<string, unknown>) => api.post<{ message?: string }>("/admin/settings/email/test", { to, ...overrides }).then((r) => r.data),
};

// ---------- logs ----------
export interface ActivityLog {
  id: string;
  createdAt: string;
  actorType: "ADMIN" | "CUSTOMER" | "GUEST" | "SYSTEM";
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  category: string;
  summary: string;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  method: string | null;
  path: string | null;
  statusCode: number | null;
  success: boolean;
  errorMessage: string | null;
  changes: unknown;
  ip: string | null;
  userAgent: string | null;
  durationMs: number | null;
}
export interface ActivityStats {
  total: number;
  failed: number;
  byCategory: { category: string; count: number }[];
  byActorType: { actorType: string; count: number }[];
  topActions: { action: string; count: number }[];
}
export interface AuditLog {
  id: string;
  at: string;
  action: string;
  entity: string;
  entityId: string | null;
  admin: { id: string; name: string; email: string } | null;
  changes: { field: string; from: unknown; to: unknown }[] | null;
  ip: string | null;
}
export const logsApi = {
  // the server calls the free-text filter `q`
  activity: ({ search, ...f }: Record<string, unknown>) => api.get<Paged<ActivityLog>>("/admin/activity-logs", { params: clean({ ...f, q: search }) }).then((r) => r.data),
  activityStats: (f: Record<string, unknown>) => api.get<ActivityStats>("/admin/activity-logs/stats", { params: clean(f) }).then((r) => r.data),
  // the server calls the free-text filter `q`
  audit: ({ search, ...f }: Record<string, unknown>) => api.get<Paged<AuditLog>>("/admin/audit-logs", { params: clean({ ...f, q: search }) }).then((r) => r.data),
  auditTypes: () => api.get<{ types: Record<string, string[]>; actions: string[] }>("/admin/audit-logs/types").then((r) => r.data),
};

// ---------- account ----------
export interface Profile { id: string; email: string; name: string; phone: string | null; role: string; avatarUrl: string | null; createdAt: string }
export const accountApi = {
  me: () => api.get<Profile>("/admin/auth/me").then((r) => r.data),
  update: (b: { name?: string; phone?: string }) => api.patch<Profile>("/admin/auth/me", b).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ accessToken: string; refreshToken: string }>("/admin/auth/change-password", { currentPassword, newPassword }).then((r) => r.data),
};
