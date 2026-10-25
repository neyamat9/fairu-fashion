import { useQuery } from "@tanstack/react-query";
import { BellRing, Trash2 } from "lucide-react";
import { backInStockApi, type WaitRequest, type WaitingItem } from "@/api/care";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAct } from "@/hooks/useAct";
import { useConfirm } from "@/hooks/useConfirm";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime } from "@/lib/format";

export default function BackInStock() {
  const [f, setF] = useUrlState({ tab: "items", search: "", inStockNow: "", notified: "", page: "1" });
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const sum = useQuery({ queryKey: ["bis", "summary"], queryFn: backInStockApi.summary });
  const items = useInfiniteList(["bis", "items", search, f.inStockNow], (page) => backInStockApi.list({ search, inStockNow: f.inStockNow, page, limit: 20 }), { enabled: f.tab === "items" });
  const reqs = useInfiniteList(["bis", "requests", search, f.notified], (page) => backInStockApi.requests({ email: search, notified: f.notified, page, limit: 20 }), { enabled: f.tab === "requests" });
  const notify = useAct((i: WaitingItem) => backInStockApi.notify(i.productId, i.variantId), { success: "Alerts are being sent", invalidate: [["bis"]] });
  const confirm = useConfirm();
  const remove = useAct((id: string) => backInStockApi.remove(id), { success: "Request removed", invalidate: [["bis"]] });
  const s = sum.data;

  const itemCols: Column<WaitingItem>[] = [
    { key: "i", header: "Item", cell: (i) => <div className="max-w-[320px]"><p className="truncate font-medium">{i.productName}</p><p className="text-[11px] text-muted-foreground">{[i.variantName, i.sku].filter(Boolean).join(" · ") || "—"}</p></div> },
    { key: "w", header: "Waiting", align: "right", cell: (i) => <b>{i.waiting}</b> },
    { key: "st", header: "Stock now", align: "right", cell: (i) => i.stock },
    { key: "s", header: "State", cell: (i) => (i.readyToAlert ? <Badge variant="success">Back in stock</Badge> : <StatusBadge status="out" label="Still out" />) },
    { key: "f", header: "Failed", align: "right", cell: (i) => (i.failed ? <span className="text-destructive">{i.failed}</span> : "—") },
    { key: "o", header: "Waiting since", cell: (i) => dateTime(i.oldest) },
    { key: "a", header: "", align: "right", cell: (i) => <Button size="xs" variant="outline" disabled={i.stock <= 0} title={i.stock <= 0 ? "Restock first" : undefined} loading={notify.isPending && notify.variables?.productId === i.productId && notify.variables?.variantId === i.variantId} onClick={() => notify.mutate(i)}><BellRing /> Alert now</Button> },
  ];
  const reqCols: Column<WaitRequest>[] = [
    { key: "e", header: "Email", cell: (r) => <span className="font-medium">{r.email}</span> },
    { key: "p", header: "Product", cell: (r) => <span className="line-clamp-1 max-w-[260px]">{r.product.name}</span> },
    { key: "s", header: "Status", cell: (r) => (r.notified ? <Badge variant="success">Notified {r.notifiedAt && dateTime(r.notifiedAt)}</Badge> : r.lastError ? <Badge variant="danger" title={r.lastError}>Failed ×{r.attempts}</Badge> : <Badge variant="warning">Waiting</Badge>) },
    { key: "d", header: "Asked", cell: (r) => dateTime(r.createdAt) },
    { key: "a", header: "", align: "right", cell: (r) => <Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={async () => { if (await confirm({ title: `Remove ${r.email}?`, description: "They will no longer be emailed when this item is back.", confirmLabel: "Remove", destructive: true })) remove.mutate(r.id); }}><Trash2 className="text-destructive" /></Button> },
  ];

  return (
    <div>
      <PageHeader title="Back in stock" description="Customers waiting for sold-out items. They are emailed automatically when stock returns." />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="People waiting" value={s?.waitingRequests ?? "—"} loading={sum.isLoading} />
        <StatCard label="Items wanted" value={s?.waitingItems ?? "—"} tone="orange" loading={sum.isLoading} />
        <StatCard label="Ready to alert" value={s?.readyToAlert ?? "—"} tone="green" loading={sum.isLoading} />
        <StatCard label="Failed" value={s?.failedAfterRetries ?? "—"} tone="red" loading={sum.isLoading} />
      </div>
      <Tabs value={f.tab} onValueChange={(t) => setF({ tab: t })}>
        <TabsList className="mb-3"><TabsTrigger value="items">By item</TabsTrigger><TabsTrigger value="requests">Every request</TabsTrigger></TabsList>
        <TabsContent value="items">
          <DataTable infinite={items} columns={itemCols} rowKey={(i) => `${i.productId}-${i.variantId ?? ""}`} empty={{ title: "Nobody is waiting" }}
            toolbar={<FilterBar><SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Product, SKU…" /><FilterSelect value={f.inStockNow} onChange={(v) => setF({ inStockNow: v })} all="All" options={[{ value: "true", label: "Back in stock now" }]} /></FilterBar>} />
        </TabsContent>
        <TabsContent value="requests">
          <DataTable infinite={reqs} columns={reqCols} empty={{ title: "No requests" }}
            toolbar={<FilterBar><SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Email…" /><FilterSelect value={f.notified} onChange={(v) => setF({ notified: v })} all="All" options={[{ value: "false", label: "Not yet notified" }, { value: "true", label: "Notified" }]} /></FilterBar>} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
