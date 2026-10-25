import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Boxes, PackageX, SlidersHorizontal, Upload, Wallet } from "lucide-react";
import { inventoryApi, type BulkStockResult, type InventoryItem } from "@/api/inventory";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput, DateInput } from "@/components/shared/FilterBar";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime, money, num, titleCase } from "@/lib/format";
import { Link } from "react-router";

function AdjustDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [mode, setMode] = useState<"ADD" | "REMOVE" | "SET">("ADD");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("RESTOCK");
  const [note, setNote] = useState("");
  const save = useAct(() => inventoryApi.adjust({ productId: item.productId, variantId: item.variantId ?? undefined, mode, quantity: Number(qty), reason, note: note || undefined }), {
    success: "Stock updated",
    invalidate: [["inventory"], ["products"], ["product", item.productId]],
    onSuccess: onClose,
  });
  const after = mode === "ADD" ? item.stock + Number(qty || 0) : mode === "REMOVE" ? item.stock - Number(qty || 0) : Number(qty || 0);
  const bad = !/^\d+$/.test(qty) || (mode !== "SET" && Number(qty) < 1) || after < 0;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>{item.productName}{item.variantName ? ` — ${item.variantName}` : ""} · now {item.stock}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label="What happened?">
            <Select value={mode} onChange={(e) => { const m = e.target.value as typeof mode; setMode(m); setReason(m === "ADD" ? "RESTOCK" : m === "REMOVE" ? "DAMAGED" : "ADJUSTMENT"); }}>
              <option value="ADD">Received stock (add)</option>
              <option value="REMOVE">Took stock out (remove)</option>
              <option value="SET">Stock count (set exact number)</option>
            </Select>
          </Field>
          <Field label={mode === "SET" ? "Counted quantity" : "Units"} error={after < 0 ? "Cannot go below zero" : undefined}>
            <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          </Field>
          <Field label="Reason">
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              {["RESTOCK", "ADJUSTMENT", "DAMAGED", "TRANSFER"].map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
            </Select>
          </Field>
          <Field label="Note"><Input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></Field>
          {qty !== "" && !bad && <p className="text-xs text-muted-foreground">Stock will go from <b>{item.stock}</b> to <b>{after}</b>.</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} disabled={bad} onClick={() => save.mutate()}>Update stock</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkDialog({ onClose }: { onClose: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<File | null>(null);
  const [mode, setMode] = useState<"set" | "add">("set");
  const [res, setRes] = useState<BulkStockResult | null>(null);
  const run = useAct((dry: boolean) => inventoryApi.bulk(f!, mode, dry), {
    invalidate: [["inventory"], ["products"]],
    onSuccess: (r) => {
      setRes(r);
      if (!r.dryRun) toast.success(`${r.updated} updated${r.errors ? `, ${r.errors} skipped` : ""}`);
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Update stock from a CSV</DialogTitle>
          <DialogDescription>Columns: <code>sku</code> (variant SKU or product code), <code>stock</code>, optional <code>note</code>. Check first, then apply.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => { setF(e.target.files?.[0] ?? null); setRes(null); }} />
            <Button variant="outline" size="sm" onClick={() => file.current?.click()}><Upload /> {f ? f.name : "Choose CSV file"}</Button>
            <Select value={mode} onChange={(e) => { setMode(e.target.value as "set" | "add"); setRes(null); }} className="w-auto">
              <option value="set">File holds the new stock</option>
              <option value="add">File holds units received (add)</option>
            </Select>
          </div>
          {res && (
            <div className="rounded border border-border">
              <p className="border-b border-border bg-muted/50 px-3 py-2 text-[13px] font-medium">
                {res.dryRun ? "Check result (nothing changed yet): " : "Done: "}{res.updated} to update · {res.unchanged} unchanged · {res.errors} with problems
              </p>
              <ul className="max-h-64 divide-y divide-border overflow-y-auto text-[13px]">
                {res.results.map((r) => (
                  <li key={r.line} className="flex items-center justify-between gap-3 px-3 py-1.5">
                    <span>Line {r.line} · <b>{r.sku}</b></span>
                    {r.status === "error" ? <span className="text-destructive">{r.error}</span> : <span className="text-muted-foreground">{r.before} → {r.after}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" disabled={!f} loading={run.isPending && run.variables === true} onClick={() => run.mutate(true)}>Check file</Button>
          <Button disabled={!f || !res || !!res.dryRun === false || res.updated === 0} loading={run.isPending && run.variables === false} onClick={() => run.mutate(false)}>Apply changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const D = { search: "", state: "", tab: "items", reason: "", from: "", to: "", page: "1" };

export default function Inventory() {
  const [f, setF] = useUrlState(D);
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [adj, setAdj] = useState<InventoryItem | null>(null);
  const [bulk, setBulk] = useState(false);

  const sum = useQuery({ queryKey: ["inventory", "summary"], queryFn: inventoryApi.summary });
  const items = useInfiniteList(["inventory", "items", search, f.state], (page) => inventoryApi.items({ search, state: f.state || undefined, page, limit: 20 }), { enabled: f.tab === "items" });
  const logs = useInfiniteList(["inventory", "logs", f.reason, f.from, f.to], (page) => inventoryApi.logs({ reason: f.reason, from: f.from, to: f.to ? `${f.to}T23:59:59` : undefined, page, limit: 20 }), { enabled: f.tab === "logs" });
  const s = sum.data;

  const cols: Column<InventoryItem>[] = [
    { key: "item", header: "Item", sk: "lines2", cell: (i) => (<div className="max-w-[320px]"><Link to={`/products/${i.productId}/edit`} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:text-primary">{i.productName}</Link><p className="truncate text-[11px] text-muted-foreground">{[i.variantName, i.sku].filter(Boolean).join(" · ") || "—"}</p></div>) },
    { key: "status", header: "Status", sk: "badge", cell: (i) => <StatusBadge status={i.status} /> },
    { key: "stock", header: "In stock", align: "right", sk: "num", cell: (i) => <b>{i.stock}</b> },
    { key: "state", header: "Level", sk: "badge", cell: (i) => <StatusBadge status={i.state} label={i.state === "in" ? "In stock" : i.state === "low" ? `Low (≤${i.threshold})` : "Out"} /> },
    { key: "cost", header: "Value (cost)", align: "right", sk: "num", cell: (i) => money(Number(i.cost) * i.stock) },
    { key: "act", header: "", align: "right", sk: "btn", cell: (i) => <Button size="xs" variant="outline" onClick={() => setAdj(i)}><SlidersHorizontal /> Adjust</Button> },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels, adjustments and the full movement history."
        actions={<>
          <DownloadButton path="/admin/inventory/export" params={{ search, state: f.state }} filename="inventory.csv" />
          <Button variant="outline" size="sm" onClick={() => setBulk(true)}><Upload /> Bulk update</Button>
        </>}
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard hintSk label="Units on hand" value={s ? num(s.unitsOnHand) : "—"} hint={s ? `${s.skuCount} items tracked` : undefined} icon={<Boxes className="size-4" />} loading={sum.isLoading} />
        <StatCard hintSk label="Stock value (cost)" value={s ? money(s.stockValueAtCost) : "—"} hint={s ? `${money(s.stockValueAtRetail)} at retail` : undefined} icon={<Wallet className="size-4" />} tone="green" loading={sum.isLoading} />
        <StatCard label="Low stock" value={s?.lowStock ?? "—"} icon={<AlertTriangle className="size-4" />} tone="orange" loading={sum.isLoading} onClick={() => setF({ tab: "items", state: "low" })} />
        <StatCard label="Out of stock" value={s?.outOfStock ?? "—"} icon={<PackageX className="size-4" />} tone="red" loading={sum.isLoading} onClick={() => setF({ tab: "items", state: "out" })} />
      </div>

      <Tabs value={f.tab} onValueChange={(t) => setF({ tab: t })}>
        <TabsList className="mb-3">
          <TabsTrigger value="items">Stock levels</TabsTrigger>
          <TabsTrigger value="logs">Movement history</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <DataTable infinite={items}
            columns={cols}
            rowKey={(i) => `${i.productId}-${i.variantId ?? ""}`}
            empty={{ title: "Nothing here", description: "No items match the filters." }}
            toolbar={
              <FilterBar>
                <SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Product, variant, SKU…" />
                <FilterSelect value={f.state} onChange={(v) => setF({ state: v })} all="All levels" options={[{ value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }]} />
              </FilterBar>
            }
          />
        </TabsContent>
        <TabsContent value="logs">
          <DataTable
            infinite={logs}
            columns={[
              { key: "when", header: "When", cell: (l) => <span className="text-[13px]">{dateTime(l.createdAt)}</span> },
              { key: "item", header: "Item", sk: "lines2", cell: (l) => <div className="max-w-[260px] truncate"><span className="font-medium">{l.product.name}</span>{l.variant && <span className="text-muted-foreground"> — {l.variant.name}</span>}</div> },
              { key: "reason", header: "Reason", cell: (l) => <StatusBadge status={l.reason} /> },
              { key: "change", header: "Change", align: "right", cell: (l) => <b className={l.change > 0 ? "text-emerald-600" : l.change < 0 ? "text-destructive" : ""}>{l.change > 0 ? `+${l.change}` : l.change}</b> },
              { key: "qty", header: "Stock", align: "right", cell: (l) => `${l.quantityBefore} → ${l.quantityAfter}` },
              { key: "ref", header: "Reference / note", cell: (l) => <span className="text-xs text-muted-foreground">{[l.reference, l.note].filter(Boolean).join(" · ") || "—"}</span> },
              { key: "by", header: "By", cell: (l) => <span className="text-xs">{l.admin?.name ?? "System"}</span> },
            ] as Column<(typeof logs.rows)[number]>[]}
            empty={{ title: "No stock movements" }}
            toolbar={
              <FilterBar>
                <FilterSelect value={f.reason} onChange={(v) => setF({ reason: v })} all="All reasons" options={["RESTOCK", "SALE", "RETURN", "ADJUSTMENT", "DAMAGED", "TRANSFER"].map((r) => ({ value: r, label: titleCase(r) }))} />
                <DateInput label="From" value={f.from} onChange={(v) => setF({ from: v })} />
                <DateInput label="To" value={f.to} onChange={(v) => setF({ to: v })} />
              </FilterBar>
            }
          />
        </TabsContent>
      </Tabs>
      {adj && <AdjustDialog item={adj} onClose={() => setAdj(null)} />}
      {bulk && <BulkDialog onClose={() => setBulk(false)} />}
    </div>
  );
}
