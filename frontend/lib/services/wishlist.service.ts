import { api, assetUrl } from '../api/client';
import type { WishlistItem } from '../types/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchWishlist(): Promise<WishlistItem[]> {
  const rows = await api.get<any[]>('/customer/wishlist');
  return rows.map((w) => ({
    productId: w.productId,
    slug: w.slug,
    name: w.name,
    price: Number(w.price),
    originalPrice: w.originalPrice != null && Number(w.originalPrice) > Number(w.price) ? Number(w.originalPrice) : undefined,
    imageUrl: assetUrl(w.imageUrl),
    stock: Number(w.stock),
    addedAt: w.addedAt,
  }));
}
export const addToWishlist = (productId: string) => api.post(`/customer/wishlist/${productId}`);
export const removeFromWishlist = (productId: string) => api.delete(`/customer/wishlist/${productId}`);
