import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { productsApi, type ProductVariant } from "@/api/products";
import { draftError, emptyDraft, fromVariant, toInput, type VariantDraft } from "./variantDraft";
import { useAct } from "@/hooks/useAct";

// create mode: `productId` undefined, parent owns the list.
// edit mode: each row is saved on its own through the variant endpoints.
export function VariantsEditor({ productId, value, onChange, saved }: { productId?: string; value: VariantDraft[]; onChange: (v: VariantDraft[]) => void; saved?: ProductVariant[] }) {
  const [del, setDel] = useState<VariantDraft | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});
  const refresh = [["product", productId], ["products"], ["inventory"]];
  const save = useAct(
    async (d: VariantDraft) => {
      const e = draftError(d);
      if (e) { setErr((x) => ({ ...x, [d.key]: e })); throw new Error(e); }
      setErr((x) => { const n = { ...x }; delete n[d.key]; return n; });
      return d.id ? productsApi.updateVariant(productId!, d.id, toInput(d)) : productsApi.addVariant(productId!, toInput(d));
    },
    { success: "Variant saved", invalidate: refresh },
  );
  const remove = useAct(async (d: VariantDraft) => { if (d.id && productId) await productsApi.removeVariant(productId, d.id); }, {
    success: "Variant removed", invalidate: refresh, onSuccess: () => { if (del) onChange(value.filter((x) => x.key !== del.key)); setDel(null); },
  });
  const set = (key: string, patch: Partial<VariantDraft>) => onChange(value.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  const dirty = (d: VariantDraft) => { const s = saved?.find((v) => v.id === d.id); return !s || JSON.stringify(toInput(fromVariant(s))) !== JSON.stringify(toInput(d)); };

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">
        Use variants for different colours, sizes or storage. Each has its own SKU and stock. The product's stock becomes the total of all variants.
      </p>
      {value.length === 0 && <p className="rounded border border-dashed border-border py-6 text-center text-[13px] text-muted-foreground">No variants — this product is sold as a single item.</p>}
      {value.map((d) => (
        <div key={d.key} className="rounded border border-border p-3">
          <div className="grid gap-2 sm:grid-cols-6">
            <label className="text-[11px] text-muted-foreground sm:col-span-2">Name<Input value={d.name} onChange={(e) => set(d.key, { name: e.target.value })} placeholder="e.g. Black / 256GB" /></label>
            <label className="text-[11px] text-muted-foreground sm:col-span-2">SKU *<Input value={d.sku} onChange={(e) => set(d.key, { sku: e.target.value })} /></label>
            <label className="text-[11px] text-muted-foreground">Price ৳<Input type="number" min={0} value={d.price} onChange={(e) => set(d.key, { price: e.target.value })} placeholder="same" /></label>
            <label className="text-[11px] text-muted-foreground">Stock<Input type="number" min={0} value={d.stock} onChange={(e) => set(d.key, { stock: e.target.value })} disabled={!!d.id} title={d.id ? "Change stock from Inventory so it is logged" : undefined} /></label>
            <label className="text-[11px] text-muted-foreground">Option 1<Input value={d.a1n} onChange={(e) => set(d.key, { a1n: e.target.value })} placeholder="Colour" /></label>
            <label className="text-[11px] text-muted-foreground">Value<Input value={d.a1v} onChange={(e) => set(d.key, { a1v: e.target.value })} placeholder="Black" /></label>
            <label className="text-[11px] text-muted-foreground">Option 2<Input value={d.a2n} onChange={(e) => set(d.key, { a2n: e.target.value })} placeholder="Storage" /></label>
            <label className="text-[11px] text-muted-foreground">Value<Input value={d.a2v} onChange={(e) => set(d.key, { a2v: e.target.value })} placeholder="256GB" /></label>
            <div className="flex items-end justify-end gap-2 sm:col-span-2">
              {productId && <Button size="sm" variant="outline" loading={save.isPending && save.variables?.key === d.key} disabled={!!d.id && !dirty(d)} onClick={() => save.mutate(d)}><Save /> Save</Button>}
              <Button size="icon-sm" variant="ghost" aria-label="Remove variant" onClick={() => (d.id ? setDel(d) : onChange(value.filter((x) => x.key !== d.key)))}><Trash2 className="text-destructive" /></Button>
            </div>
          </div>
          {err[d.key] && <p className="mt-1 text-xs text-destructive">{err[d.key]}</p>}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...value, emptyDraft()])}><Plus /> Add variant</Button>
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Remove this variant?" description="Its stock goes with it. Past orders keep their record." confirmLabel="Remove" destructive loading={remove.isPending} onConfirm={() => del && remove.mutate(del)} />
    </div>
  );
}
