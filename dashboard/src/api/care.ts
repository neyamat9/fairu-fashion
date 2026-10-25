import { api, clean, type Paged } from "./client";

// ---------- reviews & questions ----------
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "FLAGGED";
export interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; slug: string };
  images: { id: string; url: string }[];
}
export interface Question {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  product: { id: string; name: string; slug: string };
}
export const reviewsApi = {
  list: (f: Record<string, unknown>) => api.get<Paged<Review> & { statusCounts: Record<string, number> }>("/admin/reviews", { params: clean(f) }).then((r) => r.data),
  stats: () => api.get<{ byStatus: Record<string, number>; approvedByRating: Record<string, number>; questionsAwaitingAnswer: number }>("/admin/reviews/stats").then((r) => r.data),
  setStatus: (id: string, status: ReviewStatus) => api.patch(`/admin/reviews/${id}/status`, { status }).then((r) => r.data),
  bulkStatus: (ids: string[], status: ReviewStatus) => api.patch("/admin/reviews/bulk-status", { ids, status }).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/reviews/${id}`).then((r) => r.data),
  questions: (f: Record<string, unknown>) => api.get<Paged<Question>>("/admin/questions", { params: clean(f) }).then((r) => r.data),
  answer: (id: string, answer: string) => api.put(`/admin/questions/${id}/answer`, { answer }).then((r) => r.data),
  removeQuestion: (id: string) => api.delete(`/admin/questions/${id}`).then((r) => r.data),
};

// ---------- returns ----------
export type ReturnStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PICKED_UP" | "RECEIVED" | "REFUNDED" | "REPLACED";
export interface ReturnRow {
  id: string;
  reason: string;
  detail: string | null;
  status: ReturnStatus;
  adminNote: string | null;
  pickupAddress: string | null;
  pickupDate: string | null;
  requestedAt: string;
  user: { id: string; name: string; email: string; phone: string | null };
  order: { id: string; orderNumber: string };
  items: { id: string; quantity: number; refundAmount: string; condition: string | null; orderItem: { productName: string; productSlug: string } }[];
}
export const returnsApi = {
  list: (f: Record<string, unknown>) => api.get<Paged<ReturnRow>>("/admin/returns", { params: clean(f) }).then((r) => r.data),
  setStatus: (id: string, status: ReturnStatus, note?: string) => api.patch(`/admin/returns/${id}/status`, { status, note: note || undefined }).then((r) => r.data),
};
export const RETURN_FLOW: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["PICKED_UP", "REJECTED"],
  PICKED_UP: ["RECEIVED"],
  RECEIVED: ["REFUNDED", "REPLACED"],
  REFUNDED: [],
  REPLACED: [],
  REJECTED: [],
};

// ---------- support tickets ----------
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED";
export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: "low" | "normal" | "high" | "urgent";
  category: string;
  lastMessageAt: string;
  createdAt: string;
  orderId: string | null;
  submittedBy: { id: string; name: string; email: string; phone: string | null };
  assignedTo: { id: string; name: string } | null;
  messageCount?: number;
}
export interface TicketDetail extends Ticket {
  messages: { id: string; message: string; isStaff: boolean; isInternal: boolean; createdAt: string; user: { id: string; name: string } | null }[];
  order: { id: string; orderNumber: string } | null;
}
export const ticketsApi = {
  list: (f: Record<string, unknown>) => api.get<Paged<Ticket> & { counts: Record<string, number> }>("/admin/support-tickets", { params: clean(f) }).then((r) => r.data),
  get: (id: string) => api.get<TicketDetail>(`/admin/support-tickets/${id}`).then((r) => r.data),
  reply: (id: string, b: { message: string; internal?: boolean; status?: TicketStatus }) => api.post(`/admin/support-tickets/${id}/reply`, b).then((r) => r.data),
  update: (id: string, b: { status?: TicketStatus; priority?: string }) => api.patch(`/admin/support-tickets/${id}`, b).then((r) => r.data),
};

// ---------- contact messages ----------
export type ContactStatus = "NEW" | "READ" | "REPLIED" | "ARCHIVED";
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactStatus;
  adminNote: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}
export const contactApi = {
  list: (f: Record<string, unknown>) => api.get<Paged<ContactMessage> & { unread: number }>("/admin/contact-messages", { params: clean(f) }).then((r) => r.data),
  update: (id: string, b: { status?: ContactStatus; adminNote?: string | null }) => api.patch(`/admin/contact-messages/${id}`, b).then((r) => r.data),
  reply: (id: string, message: string) => api.post(`/admin/contact-messages/${id}/reply`, { message }).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/contact-messages/${id}`).then((r) => r.data),
};

// ---------- newsletter ----------
export interface Subscriber {
  id: string;
  email: string;
  status: "SUBSCRIBED" | "UNSUBSCRIBED";
  source: string | null;
  subscribedAt: string;
  unsubscribedAt: string | null;
}
export const newsletterApi = {
  list: (f: Record<string, unknown>) => api.get<Paged<Subscriber> & { stats: { subscribed: number; unsubscribed: number } }>("/admin/newsletter", { params: clean(f) }).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/newsletter/${id}`).then((r) => r.data),
};

// ---------- back in stock ----------
export interface WaitingItem {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  status: string;
  stock: number;
  waiting: number;
  failed: number;
  oldest: string;
  readyToAlert: boolean;
}
export interface WaitRequest {
  id: string;
  email: string;
  notified: boolean;
  notifiedAt: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  variantId: string | null;
  product: { id: string; name: string };
}
export const backInStockApi = {
  summary: () => api.get<{ waitingRequests: number; waitingItems: number; readyToAlert: number; failedAfterRetries: number }>("/admin/back-in-stock/summary").then((r) => r.data),
  list: (f: Record<string, unknown>) => api.get<Paged<WaitingItem>>("/admin/back-in-stock", { params: clean(f) }).then((r) => r.data),
  requests: (f: Record<string, unknown>) => api.get<Paged<WaitRequest>>("/admin/back-in-stock/requests", { params: clean(f) }).then((r) => r.data),
  notify: (productId: string, variantId?: string | null) => api.post<unknown>("/admin/back-in-stock/notify", { productId, variantId: variantId || undefined }).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/back-in-stock/${id}`).then((r) => r.data),
};
