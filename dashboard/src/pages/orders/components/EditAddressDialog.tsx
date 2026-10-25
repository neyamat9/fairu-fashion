import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Label } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Field } from "@/components/shared/Field";
import { LocationSelect, type LocationValue } from "@/components/shared/LocationSelect";
import { ordersApi, type OrderDetail } from "@/api/orders";
import { useAct } from "@/hooks/useAct";

export function EditAddressDialog({ order, open, onOpenChange }: { order: OrderDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const a = order.shippingAddress;
  const [form, setForm] = useState({ fullName: a?.fullName ?? "", phone: a?.phone ?? "", address: a?.line1 ?? "", postalCode: a?.postalCode ?? "" });
  const [loc, setLoc] = useState<LocationValue>({ division: a?.division ?? "", district: a?.district ?? "", upazila: a?.upazila ?? "" });
  const [recalc, setRecalc] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const save = useAct(
    () => ordersApi.address(order.id, { ...form, division: loc.division || undefined, district: loc.district || undefined, upazila: loc.upazila || undefined, postalCode: form.postalCode || undefined, recalculateShipping: recalc }),
    { success: "Address updated", invalidate: [["order", order.id], ["orders"]], onSuccess: () => onOpenChange(false) },
  );
  const submit = () => {
    if (!form.fullName.trim() || !form.address.trim()) return setErr("Name and address are required");
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ""))) return setErr("Enter a valid Bangladesh mobile number");
    if (!loc.district) return setErr("Choose a district");
    setErr(null);
    save.mutate();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Delivery address</DialogTitle>
          <DialogDescription>Can be changed until the order is handed to the courier.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {err && <p className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-destructive dark:bg-red-500/10">{err}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" required><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></Field>
            <Field label="Phone" required><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" /></Field>
          </div>
          <Field label="Address" required><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House, road, area" /></Field>
          <LocationSelect value={loc} onChange={setLoc} />
          <Field label="Postal code"><Input value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} className="max-w-[160px]" /></Field>
          <div className="flex items-center gap-2">
            <Checkbox id="recalc" checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />
            <Label htmlFor="recalc" className="cursor-pointer text-[13px] font-normal text-foreground">Recalculate the shipping cost for the new area (inside / outside Dhaka)</Label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={save.isPending} onClick={submit}>Save address</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
