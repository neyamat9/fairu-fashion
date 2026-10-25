import type { ProductVariant, VariantInput } from "@/api/products";

export interface VariantDraft {
  key: string;
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  a1n: string;
  a1v: string;
  a2n: string;
  a2v: string;
}

export const emptyDraft = (): VariantDraft => ({ key: Math.random().toString(36).slice(2), name: "", sku: "", price: "", stock: "0", a1n: "", a1v: "", a2n: "", a2v: "" });
export const fromVariant = (v: ProductVariant): VariantDraft => ({
  key: v.id, id: v.id, name: v.name, sku: v.sku, price: v.price ? String(Number(v.price)) : "", stock: String(v.stock),
  a1n: v.attribute1Name ?? "", a1v: v.attribute1Value ?? "", a2n: v.attribute2Name ?? "", a2v: v.attribute2Value ?? "",
});
export const toInput = (d: VariantDraft): VariantInput => ({
  name: d.name.trim() || undefined,
  sku: d.sku.trim(),
  price: d.price === "" ? null : Number(d.price),
  stock: Number(d.stock || 0),
  attribute1Name: d.a1n.trim() || undefined,
  attribute1Value: d.a1v.trim() || undefined,
  attribute2Name: d.a2n.trim() || undefined,
  attribute2Value: d.a2v.trim() || undefined,
});
export const draftError = (d: VariantDraft) => {
  if (!d.sku.trim()) return "SKU is required";
  if (!/^[A-Za-z0-9._-]+$/.test(d.sku.trim())) return "SKU: letters, numbers, . - _ only";
  if (d.price !== "" && !(Number(d.price) > 0)) return "Price must be above 0 (or empty to use the product price)";
  if (!/^\d+$/.test(d.stock || "0")) return "Stock must be a whole number";
  return null;
};

