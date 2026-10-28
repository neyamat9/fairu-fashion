import { api } from '../api/client';

// contact form + newsletter + back-in-stock + returns + support tickets
export const sendContactMessage = async (b: {
  name: string;
  email: string;
  phone?: string;
  topic?: string;
  subject: string;
  message: string;
  website?: string;
}) => {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(b),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send message');
  }
  return data;
};

export const subscribeNewsletter = (email: string, source = 'website') => api.post('/customer/newsletter/subscribe', { email, source });

export const notifyWhenBackInStock = (b: { productId: string; variantId?: string; email?: string }) => api.post<{ message?: string }>('/customer/back-in-stock', b);

// ── returns ──
export interface ReturnEligibility {
  orderId: string;
  orderNumber: string;
  eligible: boolean;
  reason?: string | null;
  returnWindowDays: number;
  returnDeadline: string | null;
  items: { orderItemId: string; productName: string; variantName: string | null; price: number; orderedQuantity: number; returnableQuantity: number }[];
}
export const getReturnEligibility = (orderId: string) => api.get<ReturnEligibility>(`/customer/returns/eligibility/${orderId}`, { revalidate: 0 });
export const createReturn = (b: { orderId: string; reason: string; detail?: string; pickupAddress?: string; items: { orderItemId: string; quantity: number; condition?: string }[] }) => api.post('/customer/returns', b);
export interface ReturnRequest {
  id: string;
  status: string;
  reason: string;
  detail: string | null;
  adminNote: string | null;
  requestedAt: string;
  order?: { id: string; orderNumber: string };
  items: { id: string; quantity: number; refundAmount: string; orderItem?: { productName: string } }[];
}
export const getReturns = () => api.get<ReturnRequest[]>('/customer/returns');
export const cancelReturn = (id: string) => api.post(`/customer/returns/${id}/cancel`);

// ── support tickets ──
export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  category: string;
  createdAt: string;
  lastMessageAt: string;
  messages?: { id: string; message: string; isStaff: boolean; createdAt: string }[];
}
export const getTickets = () => api.get<{ data: Ticket[] }>('/customer/support-tickets?limit=50').then((r) => r.data);
export const getTicket = (id: string) => api.get<Ticket>(`/customer/support-tickets/${id}`, { revalidate: 0 });
export const createTicket = (b: { subject: string; message: string; category?: string; orderId?: string }) => api.post<Ticket>('/customer/support-tickets', b);
export const replyTicket = (id: string, message: string) => api.post(`/customer/support-tickets/${id}/messages`, { message });
export const closeTicket = (id: string) => api.post(`/customer/support-tickets/${id}/close`);
