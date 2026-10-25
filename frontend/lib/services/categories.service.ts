import { api } from '../api/client';
import { mapCategory } from '../api/mappers';
import type { Category } from '../types/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await api.get<any[]>('/customer/categories', { revalidate: 300 });
    return rows.map(mapCategory);
  } catch {
    return []; // the menu must never break a page
  }
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  try {
    return mapCategory(await api.get<any>(`/customer/categories/${encodeURIComponent(slug)}`, { revalidate: 300 }));
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

/** Categories that actually have products — what menus and the home page should show. */
export async function getShopCategories(): Promise<Category[]> {
  const all = await getCategories();
  const stocked = all.filter((c) => c.productCount > 0);
  return stocked.length > 0 ? stocked : all;
}
