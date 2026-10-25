import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/Field";
import { ProductPicker } from "@/components/shared/ProductPicker";
import { Thumb } from "@/components/shared/Thumb";
import { ordersApi, type OrderDetail } from "@/api/orders";
import { useAct } from "@/hooks/useAct";
import { money } from "@/lib/format";

interface Line {
  key: string;
  itemId?: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string | null;
  image?: string | null;
  quantity: number;
  price: string; // text so typing is smooth
  isNew: boolean;
}

export function EditItemsDialog({ order, open, onOpenChange }: { order: OrderDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [lines, setLines] = useState<Line[]>(() =>
    order.items.map((i) => ({ key: i.id, itemId: i.id, productId: i.productId, variantId: i.variantId ?? undefined, name: i.productName, variantName: i.variantName, image: i.productImage, quantity: i.quantity, price: String(Number(i.price)), isNew: false })),
  );
  const [discount, setDiscount] = useState("");
  const [shipping, setShipping] = useState("");
  const [recalc, setRecalc] = useState(false);
  const [reason, setReason] = useState("");
  const [pendingVariant, setPendingVariant] = useState<{ id: string; name: string; image: string | null; variants: { id: string; name: string; price: string | null; stock: number }[]; price: string } | null>(null);

  const save = useAct(
    () =>
      ordersApi.items(order.id, {
        items: lines.map((l) => ({ ...(l.itemId ? { itemId: l.itemId } : { productId: l.productId, variantId: l.variantId }), quantity: l.quantity, ...(l.price !== "" ? { price: Number(l.price) } : {}) })),
        ...(discount !== "" ? { discountAmount: Number(discount) } : {}),
        ...(shipping !== "" ? { shippingCost: Number(shipping) } : {}),
        recalculateShipping: recalc || undefined,
        reason: reason || undefined,
      }),
    {
      success: "Order updated",
      invalidate: [["order", order.id], ["orders"]],
      onSuccess: (o) => {
        (o.warnings ?? []).forEach((w) => toast.info(w, { duration: 8000 }));
        onOpenChange(false);
      },
    },
  );

  const subtotal = lines.reduce((s, l) => s + Number(l.price || 0) * l.quantity, 0);
  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const invalid = lines.length === 0 || lines.some((l) => !(l.quantity >= 1) || Number(l.price) < 0 || l.price === "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Edit items — {order.orderNumber}</DialogTitle>
          <DialogDescription>Stock and totals follow your changes. A coupon discount is recalculated unless you set the discount by hand.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.key} className="flex flex-wrap items-center gap-3 rounded border border-border p-2">
                <Thumb src={l.image} className="size-10" />
                <div className="min-w-[160px] flex-1">
                  <p className="text-[13px] font-medium">{l.name}</p>
                  {l.variantName && <p className="text-[11px] text-muted-foreground">{l.variantName}</p>}
                  {l.isNew && <span className="text-[10px] font-semibold uppercase text-orange-600">New line</span>}
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">Qty
                  <Input type="number" min={1} max={100} value={l.quantity} onChange={(e) => setLine(l.key, { quantity: Math.floor(Number(e.target.value)) })} className="w-16" />
                </label>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">Price ৳
                  <Input type="number" min={0} step="0.01" value={l.price} onChange={(e) => setLine(l.key, { price: e.target.value })} className="w-24" />
                </label>
                <span className="w-24 text-right text-[13px] font-semibold">{money(Number(l.price || 0) * l.quantity)}</span>
                <Button size="icon-sm" variant="ghost" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove line" disabled={lines.length === 1}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label className="mb-1 block">Add a product</Label>
            <ProductPicker
              onPick={(p) => {
                if (p.variants.length) {
                  setPendingVariant({ id: p.id, name: p.name, image: p.images[0]?.url ?? null, variants: p.variants, price: p.sellingPrice });
                } else {
                  setLines((ls) => [...ls, { key: `new-${p.id}`, productId: p.id, name: p.name, image: p.images[0]?.url, quantity: 1, price: String(Number(p.sellingPrice)), isNew: true }]);
                }
              }}
            />
            {pendingVariant && (
              <div className="mt-2 rounded border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-semibold">Choose an option of {pendingVariant.name}</p>
                <div className="flex flex-wrap gap-2">
                  {pendingVariant.variants.map((v) => (
                    <Button key={v.id} size="sm" variant="outline" disabled={v.stock <= 0} onClick={() => { setLines((ls) => [...ls, { key: `new-${v.id}`, productId: pendingVariant.id, variantId: v.id, name: pendingVariant.name, variantName: v.name, image: pendingVariant.image, quantity: 1, price: String(Number(v.price ?? pendingVariant.price)), isNew: true }]); setPendingVariant(null); }}>
                      {v.name} · {v.stock} left
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => setPendingVariant(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Discount ৳ (optional)" hint={`Now ${money(order.discountAmount)}${order.couponCode ? ` (coupon ${order.couponCode})` : ""}. Leave empty to keep / recalculate.`}>
              <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </Field>
            <Field label="Shipping ৳ (optional)" hint={`Now ${money(order.shippingCost)}`}>
              <Input type="number" min={0} value={shipping} onChange={(e) => setShipping(e.target.value)} disabled={recalc} />
            </Field>
            <Field label="Reason (added to the timeline)">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="recalc-ship" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />
            <Label htmlFor="recalc-ship" className="cursor-pointer text-[13px] font-normal text-foreground">Work out shipping again from the new subtotal</Label>
          </div>
        </DialogBody>
        <DialogFooter className="items-center sm:justify-between">
          <p className="text-sm">New subtotal: <b>{money(subtotal)}</b></p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button loading={save.isPending} disabled={invalid} onClick={() => save.mutate()}>Save changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
