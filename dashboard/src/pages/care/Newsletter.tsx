import { useState } from "react";
import { Trash2 } from "lucide-react";
import { newsletterApi, type Subscriber } from "@/api/care";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime } from "@/lib/format";

export default function Newsletter() {
  const [f, setF] = useUrlState({ search: "", status: "", page: "1" });
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [del, setDel] = useState<Subscriber | null>(null);
  const q = useInfiniteList(["newsletter", search, f.status], (page) => newsletterApi.list({ search, status: f.status, page, limit: 20 }));
  const remove = useAct(() => newsletterApi.remove(del!.id), { success: "Subscriber removed", invalidate: [["newsletter"]], onSuccess: () => setDel(null) });
  const cols: Column<Subscriber>[] = [
    { key: "e", header: "Email", sk: "text", cell: (s) => <span className="font-medium">{s.email}</span> },
    { key: "s", header: "Status", sk: "badge", cell: (s) => <StatusBadge status={s.status === "SUBSCRIBED" ? "ACTIVE" : "INACTIVE"} label={s.status === "SUBSCRIBED" ? "Subscribed" : "Unsubscribed"} /> },
    { key: "src", header: "Source", sk: "text", cell: (s) => s.source ?? "—" },
    { key: "d", header: "Subscribed", sk: "text", cell: (s) => dateTime(s.subscribedAt) },
    { key: "u", header: "Unsubscribed", sk: "text", cell: (s) => (s.unsubscribedAt ? dateTime(s.unsubscribedAt) : "—") },
    { key: "a", header: "", align: "right", sk: "icon", cell: (s) => <Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => setDel(s)}><Trash2 className="text-destructive" /></Button> },
  ];
  return (
    <div>
      <PageHeader title="Newsletter" description="People who signed up for offers." actions={<DownloadButton path="/admin/newsletter/export" filename="subscribers.csv" label="Export subscribed" />} />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:max-w-lg"><StatCard label="Subscribed" value={q.first?.stats.subscribed ?? "—"} tone="green" /><StatCard label="Unsubscribed" value={q.first?.stats.unsubscribed ?? "—"} /></div>
      <DataTable infinite={q} columns={cols} empty={{ title: "No subscribers yet" }}
        toolbar={<FilterBar><SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Email…" /><FilterSelect value={f.status} onChange={(v) => setF({ status: v })} all="All" options={[{ value: "SUBSCRIBED", label: "Subscribed" }, { value: "UNSUBSCRIBED", label: "Unsubscribed" }]} /></FilterBar>} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Remove ${del?.email}?`} description="They are deleted from the list." confirmLabel="Remove" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
