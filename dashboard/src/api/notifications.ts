import { api, type Paged } from "./client";

export type AdminNotificationType =
  | "NEW_ORDER" | "PAYMENT_PENDING" | "NEW_TICKET" | "TICKET_REPLY" | "RETURN_REQUESTED"
  | "LOW_STOCK" | "OUT_OF_STOCK" | "CONTACT_MESSAGE" | "QUESTION_ASKED";

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

export interface AttentionSummary {
  unreadNotifications: number;
  pendingOrders: number;
  pendingBkashPayments: number;
  openTickets: number;
  pendingReturns: number;
  unansweredQuestions: number;
  newContactMessages: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export const notificationsApi = {
  list: (params: { page?: number; limit?: number; unread?: boolean; type?: string }) =>
    api.get<Paged<AdminNotification> & { unreadCount: number }>("/admin/notifications", { params }).then((r) => r.data),
  unreadCount: () => api.get<{ unread: number }>("/admin/notifications/unread-count").then((r) => r.data.unread),
  summary: () => api.get<AttentionSummary>("/admin/notifications/summary").then((r) => r.data),
  read: (id: string) => api.patch(`/admin/notifications/${id}/read`),
  readAll: () => api.patch("/admin/notifications/read-all"),
  remove: (id: string) => api.delete(`/admin/notifications/${id}`),
};

// Where a notification should take the admin
export function notificationLink(n: AdminNotification): string {
  switch (n.type) {
    case "NEW_ORDER":
    case "PAYMENT_PENDING":
      return n.entityId ? `/orders/${n.entityId}` : "/orders";
    case "NEW_TICKET":
    case "TICKET_REPLY":
      return n.entityId ? `/support/${n.entityId}` : "/support";
    case "RETURN_REQUESTED":
      return "/returns";
    case "LOW_STOCK":
    case "OUT_OF_STOCK":
      return n.entityId ? `/products/${n.entityId}/edit` : "/inventory";
    case "CONTACT_MESSAGE":
      return "/contact";
    case "QUESTION_ASKED":
      return "/questions";
    default:
      return "/notifications";
  }
}
