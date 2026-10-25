import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Boxes, CheckCircle2, EyeOff, PackageX, Package, Percent, Trophy } from "lucide-react";
import { productsApi } from "@/api/products";
import { StatCard } from "@/components/shared/StatCard";
import { money } from "@/lib/format";
import { openInNewTab } from "@/lib/utils";

export interface ProductCardFilter {
  status: string;
  visibility: string;
  stock: string;
  onDiscount: string;
}
const none: ProductCardFilter = { status: "", visibility: "", stock: "", onDiscount: "" };

/** The cards above the products list (whole catalogue). Clicking one filters the list to it; clicking it again clears it. */
export function ProductStatCards({ current, onPick }: { current: ProductCardFilter; onPick: (f: ProductCardFilter) => void }) {
  const q = useQuery({ queryKey: ["products", "stats"], queryFn: productsApi.stats, placeholderData: (p) => p });
  const s = q.data;
  const loading = q.isLoading;
  const only = (key: keyof ProductCardFilter, value: string) => current[key] === value && Object.entries(current).every(([k, v]) => (k === key ? true : !v));
  const pick = (key: keyof ProductCardFilter, value: string) => () => onPick(only(key, value) ? none : { ...none, [key]: value });
  const isAll = Object.values(current).every((v) => !v);

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard hintSk label="Total products" value={s?.total.toLocaleString() ?? ""} hint={s ? `${s.active} live · ${s.hidden} hidden` : undefined} icon={<Boxes size={18} />} loading={loading} active={isAll} onClick={() => onPick(none)} />
      <StatCard hintSk label="Live on the shop" tone="green" value={s?.active.toLocaleString() ?? ""} hint={s ? "active products" : undefined} icon={<CheckCircle2 size={18} />} loading={loading} active={only("status", "ACTIVE")} onClick={pick("status", "ACTIVE")} />
      <StatCard hintSk label="Draft / hidden" tone="orange" value={s?.hidden.toLocaleString() ?? ""} hint={s ? "draft + inactive" : undefined} icon={<EyeOff size={18} />} loading={loading} active={only("visibility", "hidden")} onClick={pick("visibility", "hidden")} />
      <StatCard hintSk label="Low stock" tone="orange" value={s?.lowStock.toLocaleString() ?? ""} hint={s ? "at or below the alert level" : undefined} icon={<AlertTriangle size={18} />} loading={loading} active={only("stock", "low")} onClick={pick("stock", "low")} />
      <StatCard hintSk label="Out of stock" tone="red" value={s?.outOfStock.toLocaleString() ?? ""} hint={s ? "can't be bought" : undefined} icon={<PackageX size={18} />} loading={loading} active={only("stock", "out")} onClick={pick("stock", "out")} />
      <StatCard hintSk label="Stock value" tone="sky" value={s ? money(s.stockValueAtCost) : ""} hint={s ? `${money(s.stockValueAtRetail)} at retail` : undefined} icon={<Package size={18} />} loading={loading} />
      <StatCard
        hintSk
        label="Best seller (30 days)"
        tone="green"
        value={s ? (s.bestSeller ? `${s.bestSeller.units} sold` : "—") : ""}
        hint={s ? (s.bestSeller?.name ?? "no sales yet") : undefined}
        icon={<Trophy size={18} />}
        loading={loading}
        onClick={s?.bestSeller ? () => openInNewTab(`/products/${s.bestSeller!.id}/edit`) : undefined}
      />
      <StatCard hintSk label="On discount now" value={s?.onDiscount.toLocaleString() ?? ""} hint={s ? "live promo price" : undefined} icon={<Percent size={18} />} loading={loading} active={only("onDiscount", "true")} onClick={pick("onDiscount", "true")} />
    </div>
  );
}
