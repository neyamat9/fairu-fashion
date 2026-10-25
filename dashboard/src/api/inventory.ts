import { api, clean, type Paged } from "./client";

export interface InventoryItem {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string | null;
  status: string;
  stock: number;
  threshold: number;
  cost: string;
  retail: string;
  state: "in" | "low" | "out";
}
export interface InventorySummary {
  skuCount: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  unitsOnHand: number;
  stockValueAtCost: number;
  stockValueAtRetail: number;
}
export interface StockLog {
  id: string;
  change: number;
  reason: string;
  reference: string | null;
  note: string | null;
  quantityBefore: number;
  quantityAfter: number;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  variant: { id: string; name: string } | null;
  admin: { id: string; name: string; email: string } | null;
}
export interface BulkStockResult {
  dryRun: boolean;
  mode: "set" | "add";
  total: number;
  updated: number;
  unchanged: number;
  errors: number;
  results: { line: number; sku: string; status: "updated" | "unchanged" | "error"; before?: number; after?: number; error?: string }[];
}

export const inventoryApi = {
  summary: () => api.get<InventorySummary>("/admin/inventory/summary").then((r) => r.data),
  items: (f: Record<string, unknown>) => api.get<Paged<InventoryItem>>("/admin/inventory/items", { params: clean(f) }).then((r) => r.data),
  logs: (f: Record<string, unknown>) => api.get<Paged<StockLog>>("/admin/inventory/logs", { params: clean(f) }).then((r) => r.data),
  adjust: (b: { productId: string; variantId?: string; mode: "ADD" | "REMOVE" | "SET"; quantity: number; reason: string; note?: string }) => api.post("/admin/inventory/adjust", b).then((r) => r.data),
  bulk: (file: File, mode: "set" | "add", dryRun: boolean) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<BulkStockResult>("/admin/inventory/bulk-update", fd, { params: { mode, dryRun }, headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data);
  },
};
