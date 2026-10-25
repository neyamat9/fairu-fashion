import { api } from '../api/client';
import { assetUrl } from '../api/client';

export interface CheckoutSummary {
  items: { cartItemId: string; productId: string; variantId: string | null; name: string; slug: string; image: string | null; variantName: string | null; unitPrice: number; quantity: number; lineTotal: number; availableStock: number; issue: string | null }[];
  itemCount: number;
  subtotal: number;
  shipping: { zone: string; zoneLabel: string; baseRate: number; cost: number; isFree: boolean; freeShippingThreshold: number | null; amountForFreeShipping: number | null; estimatedMinDays: number; estimatedMaxDays: number };
  coupon: { applied: boolean; code: string; description: string | null; discountType: string; discount: number; shippingDiscount: number } | null;
  discountAmount: number;
  shippingCost: number;
  taxAmount: number;
  total: number;
  paymentMethods: ('CASH_ON_DELIVERY' | 'BKASH')[];
  canPlaceOrder: boolean;
  issues: string[];
}

export interface SummaryInput {
  couponCode?: string;
  district?: string;
  city?: string;
  shippingZone?: 'INSIDE_DHAKA' | 'OUTSIDE_DHAKA';
  phone?: string;
}

export async function getCheckoutSummary(input: SummaryInput = {}): Promise<CheckoutSummary> {
  const s = await api.post<CheckoutSummary>('/customer/checkout/summary', input);
  return { ...s, items: s.items.map((i) => ({ ...i, image: assetUrl(i.image) })) };
}

export async function applyCoupon(couponCode: string, input: SummaryInput = {}): Promise<CheckoutSummary> {
  const s = await api.post<CheckoutSummary>('/customer/coupons/apply', { ...input, couponCode });
  return { ...s, items: s.items.map((i) => ({ ...i, image: assetUrl(i.image) })) };
}

// Locations (division → district → area)
export interface Place {
  id: string;
  name: string;
  bnName?: string;
}
export const getDivisions = () => api.get<Place[]>('/customer/locations/divisions', { revalidate: 3600 });
export const getDistricts = (division: string) => api.get<Place[]>(`/customer/locations/divisions/${encodeURIComponent(division)}/districts`, { revalidate: 3600 });
export const getUpazilas = (district: string) => api.get<Place[]>(`/customer/locations/districts/${encodeURIComponent(district)}/upazilas`, { revalidate: 3600 });
