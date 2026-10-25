import { memo } from '../api/memo';
import { api, type Paged, type PageMeta } from '../api/client';
import { mapProduct } from '../api/mappers';
import type { Product, ProductFilters } from '../types/index';

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'rating' | 'name';

export interface ProductQuery {
  category?: string;
  subCategory?: string;
  search?: string;
  brand?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  rating?: number;
  tag?: string[];
  spec?: string[]; // "RAM:8GB|12GB"
  sortBy?: SortOption;
  page?: number;
  limit?: number;
}

function qs(q: Record<string, unknown>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    if (Array.isArray(v)) v.forEach((x) => p.append(k, String(x)));
    else p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ProductPage {
  products: Product[];
  meta: PageMeta;
}

export async function listProducts(q: ProductQuery = {}): Promise<ProductPage> {
  const res = await api.get<Paged<any>>(`/customer/products${qs({ limit: 24, ...q })}`);
  return { products: res.data.map(mapProduct), meta: res.meta };
}

export interface FacetBrand {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  count: number;
}
export interface ProductFacets {
  total: number;
  price: { min: number; max: number };
  brands: FacetBrand[];
  specs: { name: string; param: string; values: { value: string; count: number }[] }[];
  ratings: { minRating: number; count: number }[];
  tags: { tag: string; count: number }[];
}
export async function getProductFacets(scope: { category?: string; subCategory?: string; search?: string } = {}): Promise<ProductFacets> {
  const f = await api.get<any>(`/customer/products/filters${qs(scope)}`);
  return {
    total: f.total ?? 0,
    price: { min: Number(f.price?.min ?? 0), max: Number(f.price?.max ?? 0) },
    brands: f.brands ?? [],
    specs: f.specs ?? [],
    ratings: f.ratings ?? [],
    tags: f.tags ?? [],
  };
}

// Pages that only need "all products" style lists.
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  const sort: Record<string, SortOption> = { 'price-asc': 'price-asc', 'price-desc': 'price-desc', newest: 'newest', popular: 'popular' };
  const { products } = await listProducts({
    brand: filters?.brands,
    minPrice: filters?.minPrice,
    maxPrice: filters?.maxPrice,
    inStock: filters?.inStockOnly,
    sortBy: filters?.sortBy ? sort[filters.sortBy] : undefined,
    limit: 100,
  });
  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    return mapProduct(await api.get<any>(`/customer/products/${encodeURIComponent(slug)}`, { revalidate: 300 }));
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

// raw detail incl. reviews/questions the API sends with it
export async function getProductDetailRaw(slug: string): Promise<any | null> {
  try {
    return await api.get<any>(`/customer/products/${encodeURIComponent(slug)}`);
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
}

export async function getRelatedProducts(slug: string, limit = 6): Promise<Product[]> {
  const rows = await api.get<any[]>(`/customer/products/${encodeURIComponent(slug)}/related${qs({ limit })}`, { revalidate: 300 }).catch(() => []);
  return rows.map(mapProduct);
}

export async function getFeaturedProducts(limit = 8): Promise<Product[]> {
  const rows = await api.get<any[]>(`/customer/products/featured${qs({ limit })}`);
  return rows.map(mapProduct);
}

export interface SuggestionResult {
  products: Product[];
  categories: { name: string; slug: string; image: string | null }[];
  subCategories: { name: string; slug: string; parentCategory?: { name: string; slug: string } }[];
  brands: { name: string; slug: string; logo: string | null }[];
}
export async function getSuggestions(q: string, limit = 6): Promise<SuggestionResult> {
  // the same words typed again within 5 minutes are answered from memory
  const r = await memo(`suggest:${limit}:${q.trim().toLowerCase()}`, 5 * 60_000, () => api.get<any>(`/customer/products/suggestions${qs({ q, limit })}`, { revalidate: 0 }));
  return {
    products: (r.products ?? []).map(mapProduct),
    categories: r.categories ?? [],
    subCategories: r.subCategories ?? [],
    brands: r.brands ?? [],
  };
}

export async function searchProducts(query: string): Promise<Product[]> {
  if (!query.trim()) return [];
  return (await getSuggestions(query, 8)).products;
}

export async function getProductsByCategory(category: string, filters?: ProductFilters): Promise<Product[]> {
  return (await listProducts({ category, brand: filters?.brands, limit: 100 })).products;
}
export async function getProductsByBrand(brand: string): Promise<Product[]> {
  return (await listProducts({ brand: [brand], limit: 100 })).products;
}

export interface HomeData {
  featured: Product[];
  newArrivals: Product[];
  bestSellers: Product[];
  onSale: Product[];
}
export async function getHomeData(): Promise<HomeData> {
  const h = await api.get<any>('/customer/home', { revalidate: 300 });
  return {
    featured: (h.featured ?? []).map(mapProduct),
    newArrivals: (h.newArrivals ?? []).map(mapProduct),
    bestSellers: (h.bestSellers ?? []).map(mapProduct),
    onSale: (h.onSale ?? []).map(mapProduct),
  };
}
