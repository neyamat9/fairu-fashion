import { api, API_BASE_URL, tokens } from '../api/client';
import { mapOrder } from '../api/mappers';
import type { Order } from '../types/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PlaceOrderInput {
  paymentMethod: 'CASH_ON_DELIVERY' | 'BKASH' | 'NAGAD' | 'ROCKET';
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    division?: string;
    district?: string;
    upazila?: string;
    city?: string;
    postalCode: string;
  };
  shippingZone?: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';
  bkashTransactionId?: string;
  bkashSenderNumber?: string;
  couponCode?: string;
  deliveryNote?: string;
  email?: string; // guests
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  return mapOrder(await api.post<any>('/customer/orders', input));
}

export async function getOrders(): Promise<Order[]> {
  const rows = await api.get<any[]>('/customer/orders');
  return rows.map(mapOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  try {
    return mapOrder(await api.get<any>(`/customer/orders/${encodeURIComponent(id)}`));
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

export async function cancelOrder(id: string): Promise<Order> {
  return mapOrder(await api.post<any>(`/customer/orders/${id}/cancel`));
}

export const reorder = (id: string) => api.post<{ added: number; skipped?: unknown[]; unavailable?: unknown[] } & Record<string, unknown>>(`/customer/orders/${id}/reorder`);

export const claimOrders = (orders: { orderNumber: string; phone: string }[]) => api.post<{ claimed: number }>('/customer/orders/claim', { orders });

// Guest tracking: order number + phone
export interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  placedAt: string;
  estimatedDelivery: string | null;
  subtotal: string;
  shippingCost: string;
  discountAmount: string;
  total: string;
  dueAmount: string;
  deliverTo: { name: string; city: string | null } | null;
  items: { productName: string; productSlug: string; productImage: string | null; variantName: string | null; quantity: number; price: string; total: string }[];
  timeline: { status: string; note: string | null; at: string }[];
}
export const trackOrder = (orderNumber: string, phone: string) =>
  api.get<TrackedOrder>(`/customer/orders/track?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(phone)}`, { revalidate: 0 });

// The invoice is an HTML page that needs the login header, so fetch it and open it in a new tab.
export async function openInvoice(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/customer/orders/${id}/invoice`, { headers: { Authorization: `Bearer ${tokens.access ?? ''}` } });
  if (!res.ok) throw new Error('Could not load the invoice');
  const html = await res.text();
  const win = window.open('', '_blank');
  if (!win) throw new Error('Allow pop-ups to see the invoice');
  win.document.open();
  win.document.write(html);
  win.document.close();
}
