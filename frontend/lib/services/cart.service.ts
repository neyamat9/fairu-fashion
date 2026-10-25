import { api, assetUrl } from '../api/client';
import type { Cart, CartItem } from '../types/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapCartItem(i: any): CartItem {
  const price = i.variant?.price != null ? Number(i.variant.price) : Number(i.product.sellingPrice);
  return {
    id: i.id,
    productId: i.product.id,
    slug: i.product.slug,
    name: i.product.name,
    price,
    variantId: i.variant?.id ?? undefined,
    variantLabel: i.variant?.name ?? undefined,
    quantity: i.quantity,
    imageUrl: assetUrl(i.product.images?.[0]?.url),
    stock: i.variant ? Number(i.variant.stock) : Number(i.product.stock),
  };
}

export async function fetchCart(): Promise<Cart> {
  const r = await api.get<{ items: any[] }>('/customer/cart');
  return { items: r.items.map(mapCartItem), updatedAt: new Date().toISOString() };
}

export async function addCartItem(productId: string, quantity: number, variantId?: string) {
  await api.post('/customer/cart', { productId, quantity, ...(variantId ? { variantId } : {}) });
}
export async function updateCartItem(id: string, quantity: number) {
  await api.patch(`/customer/cart/${id}`, { quantity });
}
export async function removeCartItem(id: string) {
  await api.delete(`/customer/cart/${id}`);
}
export async function clearCartApi() {
  await api.delete('/customer/cart');
}
