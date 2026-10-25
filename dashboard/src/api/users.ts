import { api, clean, type Paged } from "./client";

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "BANNED";
  emailVerified: boolean;
  avatarUrl: string | null;
  totalOrders: number;
  totalSpent: string;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { orders: number; reviews: number };
}

export const usersApi = {
  list: (f: Record<string, unknown>) => api.get<Paged<CustomerRow>>("/admin/users", { params: clean(f) }).then((r) => r.data),
};

export interface CustomerDetail extends CustomerRow {
  phoneVerified: boolean;
  bio: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  newsletter: boolean;
  loginCount: number;
  stats: {
    lifetimeValue: number;
    orders: number;
    averageOrderValue: number;
    cancelledOrders: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    returns: number;
    reviews: number;
    questions: number;
    tickets: number;
    openTickets: number;
    couponUses: number;
    notes: number;
    ordersByStatus: Record<string, number>;
  };
  addresses: { id: string; fullName: string; phone: string; line1: string; district: string | null; division: string | null; upazila: string | null; isDefault: boolean }[];
}
export interface CustomerNote {
  id: string;
  note: string;
  createdAt: string;
  admin: { id: string; name: string; email: string } | null;
}
export const customersApi = {
  get: (id: string) => api.get<CustomerDetail>(`/admin/users/${id}`).then((r) => r.data),
  orders: (id: string, page: number) => api.get<Paged<import("./orders").OrderSummary>>(`/admin/users/${id}/orders`, { params: { page, limit: 10 } }).then((r) => r.data),
  addresses: (id: string) => api.get<CustomerDetail["addresses"]>(`/admin/users/${id}/addresses`).then((r) => r.data),
  tickets: (id: string) => api.get<Paged<{ id: string; ticketNumber: string; subject: string; status: string; category: string; priority: string; createdAt: string }>>(`/admin/users/${id}/tickets`, { params: { limit: 20 } }).then((r) => r.data),
  reviews: (id: string) => api.get<Paged<{ id: string; rating: number; title: string | null; comment: string | null; status: string; createdAt: string; product: { id: string; name: string } }>>(`/admin/users/${id}/reviews`, { params: { limit: 20 } }).then((r) => r.data),
  coupons: (id: string) => api.get<Paged<{ id: string; discountAmount: string; usedAt: string; orderId: string | null; coupon: { code: string } }>>(`/admin/users/${id}/coupons`, { params: { limit: 20 } }).then((r) => r.data),
  notes: (id: string) => api.get<CustomerNote[]>(`/admin/users/${id}/notes`).then((r) => r.data),
  addNote: (id: string, note: string) => api.post<CustomerNote>(`/admin/users/${id}/notes`, { note }).then((r) => r.data),
  removeNote: (id: string, noteId: string) => api.delete(`/admin/users/${id}/notes/${noteId}`).then((r) => r.data),
  setStatus: (id: string, status: CustomerRow["status"]) => api.patch(`/admin/users/${id}/status`, { status }).then((r) => r.data),
};
