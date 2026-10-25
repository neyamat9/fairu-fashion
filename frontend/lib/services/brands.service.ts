import { api } from '../api/client';
import { mapBrand } from '../api/mappers';
import type { Brand } from '../types/index';

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getBrands(): Promise<Brand[]> {
  try {
    const rows = await api.get<any[]>('/customer/brands', { revalidate: 300 });
    return rows.map(mapBrand);
  } catch {
    return [];
  }
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  try {
    return mapBrand(await api.get<any>(`/customer/brands/${encodeURIComponent(slug)}`, { revalidate: 300 }));
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}
