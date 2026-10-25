export class OrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  variantName: string | null;
  quantity: number;
  price: number;
  total: number;
}

export class OrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  placedAt: Date;
  estimatedDelivery: Date | null;
  deliveredAt: Date | null;
  trackingNumber: string | null;
  items: OrderItemResponse[];
  statusHistory: { status: string; timestamp: Date; note?: string }[];
  shippingAddress: Record<string, unknown>;
}
