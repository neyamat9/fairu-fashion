import { api, type Paged } from "./client";

export type ActiveStatus = "ACTIVE" | "INACTIVE";
export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  icon: string | null;
  description: string | null;
  isHomepage: boolean;
  status: ActiveStatus;
  displayOrder: number;
  metaTitle: string | null;
  metaDescription: string | null;
  subCategories: SubCategory[];
}
export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  icon: string | null;
  description: string | null;
  isHomepage: boolean;
  status: ActiveStatus;
  displayOrder: number;
  parentCategoryId: string;
  parentCategory?: { id: string; name: string };
}
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  description: string | null;
  website: string | null;
  country: string | null;
  foundedYear: number | null;
  isHomepage: boolean;
  displayOrder: number;
  status: ActiveStatus;
  metaTitle: string | null;
  metaDescription: string | null;
}
export type CategoryInput = Partial<Pick<Category, "name" | "slug" | "image" | "icon" | "description" | "isHomepage" | "status" | "metaTitle" | "metaDescription">>;
export type SubCategoryInput = Partial<Pick<SubCategory, "name" | "slug" | "image" | "icon" | "description" | "isHomepage" | "status" | "parentCategoryId">>;
export type BrandInput = Partial<Pick<Brand, "name" | "slug" | "logo" | "banner" | "description" | "website" | "country" | "foundedYear" | "isHomepage" | "status" | "metaTitle" | "metaDescription">>;

export const categoriesApi = {
  list: () => api.get<Category[]>("/admin/category").then((r) => r.data),
  create: (b: CategoryInput) => api.post<Category>("/admin/category", b).then((r) => r.data),
  update: (id: string, b: CategoryInput) => api.patch<Category>(`/admin/category/${id}`, b).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/category/${id}`).then((r) => r.data),
  reorder: (ids: string[]) => api.put("/admin/category/reorder", { ids }).then((r) => r.data),
};
export const subCategoriesApi = {
  list: () => api.get<SubCategory[]>("/admin/sub-category").then((r) => r.data),
  create: (b: SubCategoryInput) => api.post<SubCategory>("/admin/sub-category", b).then((r) => r.data),
  update: (id: string, b: SubCategoryInput) => api.patch<SubCategory>(`/admin/sub-category/${id}`, b).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/sub-category/${id}`).then((r) => r.data),
  reorder: (ids: string[]) => api.put("/admin/sub-category/reorder", { ids }).then((r) => r.data),
};
export const brandsApi = {
  list: () => api.get<Brand[]>("/admin/brand").then((r) => r.data),
  create: (b: BrandInput) => api.post<Brand>("/admin/brand", b).then((r) => r.data),
  update: (id: string, b: BrandInput) => api.patch<Brand>(`/admin/brand/${id}`, b).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/brand/${id}`).then((r) => r.data),
  reorder: (ids: string[]) => api.put("/admin/brand/reorder", { ids }).then((r) => r.data),
};

export interface MediaFile {
  id: string;
  url: string;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  folder: string;
  originalName: string;
  size: number;
  createdAt: string;
}
export interface MediaUsage {
  type: string;
  id: string;
  label: string;
  field: string;
}
export const MEDIA_FOLDERS = ["products", "banners", "brands", "categories", "site", "general"] as const;
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];
export const mediaApi = {
  list: (f: Record<string, unknown>) => api.get<Paged<MediaFile>>("/admin/uploads", { params: f }).then((r) => r.data),
  upload: (files: File[], folder: MediaFolder = "general") => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api.post<MediaFile[]>("/admin/uploads", fd, { params: { folder }, headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
  usage: (id: string) => api.get<MediaUsage[]>(`/admin/uploads/${id}/usage`).then((r) => r.data),
  remove: (id: string, force = false) => api.delete(`/admin/uploads/${id}`, { params: force ? { force: true } : undefined }).then((r) => r.data),
};

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export const BANNER_POSITIONS = ["HERO_MAIN", "HERO_SIDE", "HERO_BOTTOM", "CATEGORY_TOP", "CATEGORY_BANNER", "PROMO_BAR", "POPUP", "SIDEBAR"] as const;
export type BannerPosition = (typeof BANNER_POSITIONS)[number];
export const BANNER_LINKS = ["CUSTOM", "PRODUCT", "CATEGORY", "COLLECTION"] as const;
export interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  linkType: (typeof BANNER_LINKS)[number];
  linkResourceId: string | null;
  position: BannerPosition;
  displayOrder: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  bgColor: string | null;
  textColor: string | null;
}
export type BannerInput = Partial<Omit<Banner, "id" | "displayOrder">>;
export const bannersApi = {
  list: () => api.get<Banner[]>("/admin/banners").then((r) => r.data),
  create: (b: BannerInput) => api.post<Banner>("/admin/banners", b).then((r) => r.data),
  update: (id: string, b: BannerInput) => api.patch<Banner>(`/admin/banners/${id}`, b).then((r) => r.data),
  remove: (id: string) => api.delete(`/admin/banners/${id}`).then((r) => r.data),
  reorder: (position: BannerPosition, ids: string[]) => api.put("/admin/banners/reorder", { position, ids }).then((r) => r.data),
};
