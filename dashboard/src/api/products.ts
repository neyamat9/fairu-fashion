import { api, clean, type Paged } from "./client";

export type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK" | "DRAFT" | "DISCONTINUED";

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  productCode: string | null;
  status: ProductStatus;
  brandName: string | null;
  categoryName: string | null;
  buyingPrice: string;
  regularPrice: string;
  sellingPrice: string;
  priceBeforeDiscount: string | null;
  discountPrice: string | null;
  discountStart: string | null;
  discountEnd: string | null;
  isDiscounted: boolean;
  stock: number;
  lowStockThreshold: number;
  soldCount: number;
  isFeatured: boolean;
  createdAt: string;
  mainImage: string | null;
  stockState: "in" | "low" | "out";
  _count: { variants: number; orderItems: number; reviews: number };
}
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: string | null;
  stock: number;
  imageUrl: string | null;
  attribute1Name: string | null;
  attribute1Value: string | null;
  attribute2Name: string | null;
  attribute2Value: string | null;
  attribute3Name: string | null;
  attribute3Value: string | null;
}
export interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  isMain: boolean;
  order: number;
  uploadId: string | null;
}
export interface SpecHeader {
  id: string;
  title: string;
  items: { id: string; key: string; value: string }[];
}
export interface ProductDetail extends Omit<ProductRow, "mainImage" | "_count" | "stockState"> {
  description: string;
  shortDescription: string | null;
  warrantyInfo: string | null;
  barcode: string | null;
  discountLabel: string | null;
  profitMargin: string | null;
  normalPrice: number | null;
  weight: string | null;
  length: string | null;
  width: string | null;
  height: string | null;
  freeShipping: boolean;
  isNew: boolean;
  isHot: boolean;
  isBestSeller: boolean;
  isLimitedStock: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  inTheBox: string[];
  brandId: string | null;
  categoryId: string;
  subCategoryId: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
  specifications: SpecHeader[];
  attributes: { id: string; name: string; value: string }[];
  tags: string[];
  priceHistory: { id: string; price: string; recordedAt: string }[];
  stockState: "in" | "low" | "out";
  _count: { orderItems: number; reviews: number; questions: number };
}

export interface ProductStats {
  total: number;
  active: number;
  hidden: number;
  lowStock: number;
  outOfStock: number;
  stockValueAtCost: number;
  stockValueAtRetail: number;
  onDiscount: number;
  withoutPhoto: number;
  bestSeller: { id: string; name: string; units: number } | null;
}

export interface ProductFilters {
  search?: string;
  status?: string;
  /** "hidden" = draft + inactive */
  visibility?: string;
  /** "true" = live products on a promo price */
  onDiscount?: string;
  categoryId?: string;
  brandId?: string;
  stock?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}

export interface VariantInput {
  name?: string;
  sku: string;
  barcode?: string;
  price?: number | null;
  stock?: number;
  imageUrl?: string | null;
  attribute1Name?: string;
  attribute1Value?: string;
  attribute2Name?: string;
  attribute2Value?: string;
  attribute3Name?: string;
  attribute3Value?: string;
}

export interface ProductInput {
  name?: string;
  slug?: string;
  productCode?: string;
  barcode?: string;
  description?: string;
  shortDescription?: string;
  warrantyInfo?: string;
  status?: ProductStatus;
  buyingPrice?: number;
  regularPrice?: number;
  sellingPrice?: number;
  discountPrice?: number | null;
  discountStart?: string | null;
  discountEnd?: string | null;
  discountLabel?: string | null;
  stock?: number;
  lowStockThreshold?: number;
  freeShipping?: boolean;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  isFeatured?: boolean;
  isNew?: boolean;
  isHot?: boolean;
  isBestSeller?: boolean;
  isLimitedStock?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  inTheBox?: string[];
  brandId?: string;
  categoryId?: string;
  subCategoryId?: string;
  specifications?: { title: string; items: { key: string; value: string }[] }[];
  attributes?: { name: string; value: string }[];
  tags?: string[];
  variants?: VariantInput[];
}

export const productsApi = {
  stats: () => api.get<ProductStats>("/admin/products/stats").then((r) => r.data),
  list: (f: ProductFilters) => api.get<Paged<ProductRow>>("/admin/products", { params: clean({ ...f }) }).then((r) => r.data),
  get: (id: string) => api.get<ProductDetail>(`/admin/products/${id}`).then((r) => r.data),
  create: (body: ProductInput) => api.post<ProductDetail>("/admin/products", body).then((r) => r.data),
  update: (id: string, body: ProductInput) => api.patch<ProductDetail>(`/admin/products/${id}`, body).then((r) => r.data),
  remove: (id: string) => api.delete<{ deleted: boolean; message: string }>(`/admin/products/${id}`).then((r) => r.data),
  duplicate: (id: string) => api.post<ProductDetail>(`/admin/products/${id}/duplicate`).then((r) => r.data),
  tags: () => api.get<{ tag: string; products: number }[]>("/admin/products/tags").then((r) => r.data),
  // variants
  addVariant: (id: string, body: VariantInput) => api.post<ProductVariant>(`/admin/products/${id}/variants`, body).then((r) => r.data),
  updateVariant: (id: string, variantId: string, body: Partial<VariantInput>) => api.patch<ProductVariant>(`/admin/products/${id}/variants/${variantId}`, body).then((r) => r.data),
  removeVariant: (id: string, variantId: string) => api.delete(`/admin/products/${id}/variants/${variantId}`).then((r) => r.data),
  // photos
  uploadImages: (id: string, files: File[], alt?: string) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api.post<ProductImage[]>(`/admin/products/${id}/images`, fd, { params: alt ? { alt } : undefined, headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  attachImages: (id: string, body: { uploadIds?: string[]; urls?: string[] }) => api.post<ProductImage[]>(`/admin/products/${id}/images/attach`, body).then((r) => r.data),
  reorderImages: (id: string, imageIds: string[]) => api.put<ProductImage[]>(`/admin/products/${id}/images/order`, { imageIds }).then((r) => r.data),
  updateImage: (id: string, imageId: string, body: { alt?: string | null; isMain?: boolean }) => api.patch<ProductImage[]>(`/admin/products/${id}/images/${imageId}`, body).then((r) => r.data),
  removeImage: (id: string, imageId: string) => api.delete<ProductImage[]>(`/admin/products/${id}/images/${imageId}`).then((r) => r.data),
};
