import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3, Copy, Download, Layers, Pencil, Plus, Trash2, X } from "lucide-react";
import { couponsApi, type Coupon, type CouponInput, type DiscountType } from "@/api/coupons";
import { categoriesApi } from "@/api/catalog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Field } from "@/components/shared/Field";
import { StatCard } from "@/components/shared/StatCard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ProductPicker } from "@/components/shared/ProductPicker";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input, Select, Switch } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateOnly, dateTime, fromLocalInput, money, toLocalInput, titleCase } from "@/lib/format";

const label = (c: Pick<Coupon, "discountType" | "discountValue">) =>
  c.discountType === "PERCENTAGE" ? `${Number(c.discountValue)}% off` : c.discountType === "FREE_SHIPPING" ? "Free shipping" : `${money(c.discountValue)} off`;

function Rules({ f, set }: { f: Form; set: (p: Partial<Form>) => void }) {
  const cats = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Discount type">
          <Select value={f.discountType} onChange={(e) => set({ discountType: e.target.value as DiscountType })}>
            <option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount (৳)</option><option value="FREE_SHIPPING">Free shipping</option>
          </Select>
        </Field>
        {f.discountType !== "FREE_SHIPPING" && <Field label={f.discountType === "PERCENTAGE" ? "Percent" : "Amount ৳"} required><Input type="number" min={0} value={f.discountValue} onChange={(e) => set({ discountValue: e.target.value })} /></Field>}
        {f.discountType === "PERCENTAGE" && <Field label="Max discount ৳" hint="Optional cap"><Input type="number" min={0} value={f.maxDiscount} onChange={(e) => set({ maxDiscount: e.target.value })} /></Field>}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Minimum order ৳"><Input type="number" min={0} value={f.minOrderAmount} onChange={(e) => set({ minOrderAmount: e.target.value })} /></Field>
        <Field label="Valid from" required><Input type="datetime-local" value={f.validFrom} onChange={(e) => set({ validFrom: e.target.value })} /></Field>
        <Field label="Valid until" required><Input type="datetime-local" value={f.validTo} onChange={(e) => set({ validTo: e.target.value })} /></Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={f.firstOrderOnly} onChange={(e) => set({ firstOrderOnly: e.target.checked })} />First order of a customer only</label>
      <div className="rounded border border-border p-3">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium"><Checkbox checked={f.all} onChange={(e) => set({ all: e.target.checked })} />Applies to every product</label>
        {!f.all && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Only these categories</p>
              <div className="flex flex-wrap gap-2">
                {cats.data?.map((c) => {
                  const on = f.categories.includes(c.id);
                  return <button type="button" key={c.id} onClick={() => set({ categories: on ? f.categories.filter((x) => x !== c.id) : [...f.categories, c.id] })} className={`cursor-pointer rounded border px-2.5 py-1 text-xs ${on ? "border-orange-400 bg-orange-100 text-orange-800" : "border-border"}`}>{c.name}</button>;
                })}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Or these products</p>
              <ProductPicker onlyActive={false} onPick={(p) => !f.products.some((x) => x.id === p.id) && set({ products: [...f.products, { id: p.id, name: p.name }] })} />
              <div className="mt-2 flex flex-wrap gap-2">
                {f.products.map((p) => <Badge key={p.id} variant="brand" className="gap-1">{p.name}<button type="button" aria-label="Remove" onClick={() => set({ products: f.products.filter((x) => x.id !== p.id) })}><X className="size-3" /></button></Badge>)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Form {
  code: string; description: string; discountType: DiscountType; discountValue: string; maxDiscount: string; minOrderAmount: string;
  maxUsageCount: string; maxUsagePerUser: string; validFrom: string; validTo: string; isActive: boolean; firstOrderOnly: boolean;
  all: boolean; categories: string[]; products: { id: string; name: string }[];
}
const toLocal = (d: Date) => toLocalInput(d.toISOString());
const defaults = (): Form => ({ code: "", description: "", discountType: "PERCENTAGE", discountValue: "", maxDiscount: "", minOrderAmount: "", maxUsageCount: "", maxUsagePerUser: "", validFrom: toLocal(new Date()), validTo: toLocal(new Date(Date.now() + 30 * 864e5)), isActive: true, firstOrderOnly: false, all: true, categories: [], products: [] });
const rules = (f: Form): CouponInput => ({
  discountType: f.discountType,
  discountValue: f.discountType === "FREE_SHIPPING" ? 0 : Number(f.discountValue),
  maxDiscount: f.discountType === "PERCENTAGE" && f.maxDiscount !== "" ? Number(f.maxDiscount) : null,
  minOrderAmount: f.minOrderAmount !== "" ? Number(f.minOrderAmount) : null,
  validFrom: fromLocalInput(f.validFrom) ?? undefined, validTo: fromLocalInput(f.validTo) ?? undefined,
  firstOrderOnly: f.firstOrderOnly, appliesToAllProducts: f.all,
  applicableCategories: f.all || !f.categories.length ? null : f.categories,
  applicableProducts: f.all || !f.products.length ? null : f.products.map((p) => p.id),
});
const rulesError = (f: Form) => {
  if (f.discountType !== "FREE_SHIPPING" && !(Number(f.discountValue) > 0)) return "Enter the discount";
  if (f.discountType === "PERCENTAGE" && Number(f.discountValue) > 100) return "A percentage cannot be above 100";
  if (!f.validFrom || !f.validTo || new Date(f.validTo) <= new Date(f.validFrom)) return "The end must be after the start";
  if (!f.all && !f.categories.length && !f.products.length) return "Pick categories or products, or apply to every product";
  return null;
};

function CouponDialog({ coupon, onClose }: { coupon: Coupon | null; onClose: () => void }) {
  const [f, setF] = useState<Form>(() => coupon ? {
    code: coupon.code, description: coupon.description ?? "", discountType: coupon.discountType, discountValue: String(Number(coupon.discountValue)), maxDiscount: coupon.maxDiscount ? String(Number(coupon.maxDiscount)) : "",
    minOrderAmount: coupon.minOrderAmount ? String(Number(coupon.minOrderAmount)) : "", maxUsageCount: coupon.maxUsageCount ? String(coupon.maxUsageCount) : "", maxUsagePerUser: coupon.maxUsagePerUser ? String(coupon.maxUsagePerUser) : "",
    validFrom: toLocalInput(coupon.validFrom), validTo: toLocalInput(coupon.validTo), isActive: coupon.isActive, firstOrderOnly: coupon.firstOrderOnly, all: coupon.appliesToAllProducts,
    categories: coupon.applicableCategories ?? [], products: (coupon.applicableProducts ?? []).map((id) => ({ id, name: `Product ${id.slice(0, 6)}…` })),
  } : defaults());
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const save = useAct(
    () => {
      const b: CouponInput = { ...rules(f), description: f.description || undefined, maxUsageCount: f.maxUsageCount ? Number(f.maxUsageCount) : null, maxUsagePerUser: f.maxUsagePerUser ? Number(f.maxUsagePerUser) : null, isActive: f.isActive };
      return coupon ? couponsApi.update(coupon.id, { ...b, code: f.code.trim() }) : couponsApi.create({ ...b, code: f.code.trim().toUpperCase() });
    },
    { success: "Coupon saved", invalidate: [["coupons"]], onSuccess: onClose },
  );
  const submit = () => {
    if (!/^[A-Za-z0-9_-]{2,50}$/.test(f.code.trim())) return setErr("Code: letters, numbers, - and _");
    const e = rulesError(f);
    if (e) return setErr(e);
    setErr(null);
    save.mutate();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>{coupon ? `Edit ${coupon.code}` : "New coupon"}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          {err && <p className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-destructive dark:bg-red-500/10">{err}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code" required><Input value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="EID200" /></Field>
            <Field label="Description"><Input value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>
          </div>
          <Rules f={f} set={set} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Total uses allowed" hint="Empty = unlimited"><Input type="number" min={1} value={f.maxUsageCount} onChange={(e) => set({ maxUsageCount: e.target.value })} /></Field>
            <Field label="Uses per customer" hint="Empty = unlimited"><Input type="number" min={1} value={f.maxUsagePerUser} onChange={(e) => set({ maxUsagePerUser: e.target.value })} /></Field>
            <label className="mt-6 flex cursor-pointer items-center gap-2 text-[13px]"><Switch checked={f.isActive} onCheckedChange={(isActive) => set({ isActive })} />Active</label>
          </div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save coupon</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkDialog({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState<Form>(defaults());
  const [count, setCount] = useState("50");
  const [prefix, setPrefix] = useState("");
  const [len, setLen] = useState("8");
  const [err, setErr] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const run = useAct(() => couponsApi.bulk({ ...rules(f), count: Number(count), prefix: prefix || undefined, codeLength: Number(len), isActive: true, description: f.description || undefined }), {
    invalidate: [["coupons"]], onSuccess: (r) => { setCodes(r.codes); toast.success(`${r.count} codes created`); },
  });
  const csv = () => {
    const blob = new Blob(["code\n" + (codes ?? []).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `coupons-${prefix || "batch"}.csv`; a.click();
  };
  const submit = () => {
    const e = rulesError(f);
    if (e) return setErr(e);
    if (!(Number(count) >= 1 && Number(count) <= 1000)) return setErr("Count must be 1–1000");
    if (prefix && !/^[A-Za-z0-9]{1,12}$/.test(prefix)) return setErr("Prefix: letters and numbers, up to 12");
    setErr(null);
    run.mutate();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>Generate many single-use codes</DialogTitle><DialogDescription>Each code works once. Good for giveaways and vouchers.</DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          {codes ? (
            <>
              <p className="text-[13px]"><b>{codes.length}</b> codes were created.</p>
              <textarea readOnly className="h-48 w-full rounded border border-border bg-muted p-2 font-mono text-xs" value={codes.join("\n")} />
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(codes.join("\n")); toast.success("Copied"); }}><Copy /> Copy all</Button><Button size="sm" variant="outline" onClick={csv}><Download /> Download CSV</Button></div>
            </>
          ) : (
            <>
              {err && <p className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-destructive dark:bg-red-500/10">{err}</p>}
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="How many" required><Input type="number" min={1} max={1000} value={count} onChange={(e) => setCount(e.target.value)} /></Field>
                <Field label="Prefix"><Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="EID" /></Field>
                <Field label="Code length"><Input type="number" min={6} max={16} value={len} onChange={(e) => setLen(e.target.value)} /></Field>
                <Field label="Note"><Input value={f.description} onChange={(e) => set({ description: e.target.value })} /></Field>
              </div>
              <Rules f={f} set={set} />
            </>
          )}
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>{codes ? "Done" : "Cancel"}</Button>{!codes && <Button loading={run.isPending} onClick={submit}>Generate</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsageDialog({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("uses");
  const u = useQuery({ queryKey: ["coupon-usage", coupon.id, page], queryFn: () => couponsApi.usage(coupon.id, page), enabled: tab === "uses" });
  const us = useQuery({ queryKey: ["coupon-users", coupon.id, page], queryFn: () => couponsApi.users(coupon.id, page), enabled: tab === "users" });
  const s = (tab === "uses" ? u.data : us.data)?.summary ?? u.data?.summary;
  const who = (c: UsageRowCustomer) => (c ? c.name ?? c.guestPhone ?? "—" : "—");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="xl">
        <DialogHeader><DialogTitle>{coupon.code} — usage</DialogTitle><DialogDescription>{label(coupon)} · {dateOnly(coupon.validFrom)} → {dateOnly(coupon.validTo)}</DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <StatCard label="Uses" value={s?.uses ?? "—"} hint={s?.remainingUses != null ? `${s.remainingUses} left` : "No limit"} />
            <StatCard label="Discount given" value={s ? money(s.totalDiscountGiven) : "—"} tone="orange" />
            <StatCard label="Customers" value={s?.uniqueCustomers ?? "—"} tone="sky" />
            <StatCard label="Order revenue" value={s ? money(s.orderRevenue) : "—"} tone="green" />
          </div>
          <Tabs value={tab} onValueChange={(t) => { setTab(t); setPage(1); }}>
            <div className="flex items-center justify-between"><TabsList><TabsTrigger value="uses">Every use</TabsTrigger><TabsTrigger value="users">By customer</TabsTrigger></TabsList><DownloadButton path={`/admin/coupons/${coupon.id}/usage/export`} filename={`${coupon.code}-usage.csv`} /></div>
            <TabsContent value="uses">
              <ul className="divide-y divide-border text-[13px]">{u.data?.data.map((r) => <li key={r.id} className="flex justify-between py-2"><span>{who(r.customer)} · {r.order?.orderNumber ?? "—"} · {dateTime(r.usedAt)}</span><b>− {money(r.discountAmount)}</b></li>)}{u.data?.data.length === 0 && <li className="py-6 text-center text-muted-foreground">Not used yet.</li>}</ul>
            </TabsContent>
            <TabsContent value="users">
              <ul className="divide-y divide-border text-[13px]">{us.data?.data.map((r, i) => <li key={i} className="flex justify-between py-2"><span>{who(r.customer)} · {r.uses}×</span><span>− {money(r.discount)} · last {dateOnly(r.lastUsedAt)}</span></li>)}{us.data?.data.length === 0 && <li className="py-6 text-center text-muted-foreground">Not used yet.</li>}</ul>
            </TabsContent>
          </Tabs>
          {(() => { const m = (tab === "uses" ? u.data : us.data)?.meta; return m && m.totalPages > 1 ? <div className="flex justify-end gap-2"><Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="xs" variant="outline" disabled={page >= m.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div> : null; })()}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
type UsageRowCustomer = { name?: string; guestPhone?: string } | null;

export default function Coupons() {
  const [f, setF] = useUrlState({ search: "", state: "", page: "1" });
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [edit, setEdit] = useState<Coupon | null | "new">(null);
  const [bulk, setBulk] = useState(false);
  const [usage, setUsage] = useState<Coupon | null>(null);
  const [del, setDel] = useState<Coupon | null>(null);
  const q = useInfiniteList(["coupons", search, f.state], (page) => couponsApi.list({ search, state: f.state, page, limit: 20 }));
  const toggle = useAct((c: Coupon) => couponsApi.update(c.id, { isActive: !c.isActive }), { invalidate: [["coupons"]] });
  const remove = useAct(() => couponsApi.remove(del!.id), { success: "Coupon deleted", invalidate: [["coupons"]], onSuccess: () => setDel(null) });

  const cols: Column<Coupon>[] = [
    { key: "code", header: "Code", sk: "lines2", cell: (c) => (<div><p className="font-mono text-[13px] font-bold">{c.code}</p>{c.description && <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">{c.description}</p>}</div>) },
    { key: "d", header: "Discount", sk: "lines2", cell: (c) => <div><p className="font-medium">{label(c)}</p><p className="text-[11px] text-muted-foreground">{c.minOrderAmount ? `min ${money(c.minOrderAmount)}` : "no minimum"}{c.firstOrderOnly ? " · first order" : ""}</p></div> },
    { key: "v", header: "Valid", sk: "text", cell: (c) => <span className="text-[13px]">{dateOnly(c.validFrom)} → {dateOnly(c.validTo)}</span> },
    { key: "u", header: "Used", align: "right", sk: "num", cell: (c) => `${c.usageCount}${c.maxUsageCount ? ` / ${c.maxUsageCount}` : ""}` },
    { key: "s", header: "State", sk: "badge", cell: (c) => <StatusBadge status={c.state} label={titleCase(c.state)} /> },
    { key: "on", header: "Active", sk: "badge", cell: (c) => <div onClick={(e) => e.stopPropagation()}><Switch checked={c.isActive} onCheckedChange={() => toggle.mutate(c)} aria-label="Active" /></div> },
    { key: "a", header: "", align: "right", sk: "icon", cell: (c) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        <Button size="icon-sm" variant="ghost" aria-label="Usage" onClick={() => setUsage(c)}><BarChart3 /></Button>
        <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(c)}><Pencil /></Button>
        <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel(c)}><Trash2 className="text-destructive" /></Button>
      </div>
    ) },
  ];
  return (
    <div>
      <PageHeader title="Coupons" description="Discount codes customers type at checkout." actions={<><Button variant="outline" size="sm" onClick={() => setBulk(true)}><Layers /> Bulk generate</Button><Button variant="brand" size="sm" onClick={() => setEdit("new")}><Plus /> New coupon</Button></>} />
      <DataTable infinite={q}
        columns={cols}
        onRowClick={(c) => setUsage(c)}
        empty={{ title: "No coupons", description: "Create a code to offer discounts." }}
        toolbar={<FilterBar>
          <SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Code…" />
          <FilterSelect value={f.state} onChange={(v) => setF({ state: v })} all="Any state" options={["active", "scheduled", "expired", "inactive", "used-up"].map((s) => ({ value: s, label: titleCase(s) }))} />
        </FilterBar>}
      />
      {edit && <CouponDialog coupon={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      {bulk && <BulkDialog onClose={() => setBulk(false)} />}
      {usage && <UsageDialog coupon={usage} onClose={() => setUsage(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete ${del?.code}?`} description="A coupon that was already used can't be erased — switch it off instead." confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
