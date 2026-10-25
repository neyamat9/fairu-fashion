import { useState } from "react";
import { Link } from "react-router";
import { Check, Flag, Star, Trash2, X } from "lucide-react";
import { reviewsApi, type Review, type ReviewStatus } from "@/api/care";
import { assetUrl } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime } from "@/lib/format";
import { BulkBar } from "@/components/shared/BulkBar";
import { SavedViews } from "@/components/shared/SavedViews";

const Stars = ({ n }: { n: number }) => <span className="inline-flex text-orange-500">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`size-3.5 ${i < n ? "fill-current" : "text-border"}`} />)}</span>;

export default function Reviews() {
  const [f, setF] = useUrlState({ search: "", status: "", rating: "", page: "1" });
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [sel, setSel] = useState<string[]>([]);
  const [del, setDel] = useState<Review | null>(null);
  const q = useInfiniteList(["reviews", search, f.status, f.rating], (page) => reviewsApi.list({ search, status: f.status, rating: f.rating, page, limit: 20 }));
  const inv = [["reviews"], ["attention-summary"]];
  const set = useAct((v: { id: string; status: ReviewStatus }) => reviewsApi.setStatus(v.id, v.status), { success: "Review updated", invalidate: inv });
  const bulk = useAct((status: ReviewStatus) => reviewsApi.bulkStatus(sel, status), { success: "Reviews updated", invalidate: inv, onSuccess: () => setSel([]) });
  const remove = useAct(() => reviewsApi.remove(del!.id), { success: "Review deleted", invalidate: inv, onSuccess: () => setDel(null) });
  const counts = q.first?.statusCounts ?? {};

  const cols: Column<Review>[] = [
    { key: "r", header: "Review", sk: "lines2", cell: (r) => (
      <div className="max-w-[420px]">
        <div className="flex items-center gap-2"><Stars n={r.rating} />{r.isVerified && <Badge variant="success">Verified buyer</Badge>}</div>
        {r.title && <p className="mt-0.5 font-medium">{r.title}</p>}
        <p className="line-clamp-3 text-[13px] text-muted-foreground">{r.comment}</p>
        {r.images.length > 0 && <div className="mt-1 flex gap-1">{r.images.map((i) => <img key={i.id} src={assetUrl(i.url)} alt="" className="size-10 rounded object-cover" />)}</div>}
      </div>
    ) },
    { key: "p", header: "Product", sk: "text", cell: (r) => <Link to={`/products/${r.product.id}/edit`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="line-clamp-2 max-w-[200px] hover:text-primary">{r.product.name}</Link> },
    { key: "u", header: "Customer", sk: "lines2", cell: (r) => <div><p className="font-medium">{r.user.name}</p><p className="text-[11px] text-muted-foreground">{dateTime(r.createdAt)}</p></div> },
    { key: "s", header: "Status", sk: "badge", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "a", header: "", align: "right", sk: "icon", cell: (r) => (
      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {r.status !== "APPROVED" && <Button size="icon-sm" variant="ghost" aria-label="Approve" onClick={() => set.mutate({ id: r.id, status: "APPROVED" })}><Check className="text-emerald-600" /></Button>}
        {r.status !== "REJECTED" && <Button size="icon-sm" variant="ghost" aria-label="Reject" onClick={() => set.mutate({ id: r.id, status: "REJECTED" })}><X className="text-destructive" /></Button>}
        {r.status !== "FLAGGED" && <Button size="icon-sm" variant="ghost" aria-label="Flag" onClick={() => set.mutate({ id: r.id, status: "FLAGGED" })}><Flag className="text-amber-600" /></Button>}
        <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel(r)}><Trash2 /></Button>
      </div>
    ) },
  ];
  return (
    <div>
      <PageHeader title="Reviews" description="Approve what appears on product pages." actions={<SavedViews storageKey="reviews" builtIns={[{ name: "Waiting for approval", query: "status=PENDING" }, { name: "Low ratings", query: "rating=1" }]} />} />
      <DataTable infinite={q}
        renderCard={(r) => (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><Stars n={r.rating} />{r.isVerified && <Badge variant="success">Verified</Badge>}</span>
              <StatusBadge status={r.status} />
            </div>
            {r.title && <p className="mt-1.5 text-[13px] font-semibold">{r.title}</p>}
            <p className="mt-0.5 line-clamp-3 text-[13px] text-muted-foreground">{r.comment}</p>
            {r.images.length > 0 && <div className="mt-1.5 flex gap-1">{r.images.slice(0, 4).map((i) => <img key={i.id} src={assetUrl(i.url)} alt="" className="size-10 rounded object-cover" />)}</div>}
            <p className="mt-2 text-[11px] text-muted-foreground">
              <Link to={`/products/${r.product.id}/edit`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="font-medium text-foreground hover:text-primary">{r.product.name}</Link> · {r.user.name} · {dateTime(r.createdAt)}
            </p>
            <div className="-ml-1.5 mt-1.5 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              {r.status !== "APPROVED" && <Button size="sm" variant="ghost" onClick={() => set.mutate({ id: r.id, status: "APPROVED" })}><Check className="text-emerald-600" /> Approve</Button>}
              {r.status !== "REJECTED" && <Button size="sm" variant="ghost" onClick={() => set.mutate({ id: r.id, status: "REJECTED" })}><X className="text-destructive" /> Reject</Button>}
              <Button size="icon-sm" variant="ghost" aria-label="Flag" onClick={() => set.mutate({ id: r.id, status: "FLAGGED" })}><Flag className="text-amber-600" /></Button>
              <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel(r)}><Trash2 /></Button>
            </div>
          </div>
        )}
        columns={cols}
        selectable
        selected={sel}
        onSelect={setSel}
        empty={{ title: "No reviews", description: "Customer reviews appear here." }}
        toolbar={<FilterBar>
          <SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Text, product, customer…" />
          <FilterSelect value={f.status} onChange={(v) => setF({ status: v })} all="All statuses" options={(["PENDING", "APPROVED", "REJECTED", "FLAGGED"] as const).map((s) => ({ value: s, label: `${s[0]}${s.slice(1).toLowerCase()}${counts[s] ? ` (${counts[s]})` : ""}` }))} />
          <FilterSelect value={f.rating} onChange={(v) => setF({ rating: v })} all="Any rating" options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} stars` }))} />
        </FilterBar>}
      />
      <BulkBar count={sel.length} onClear={() => setSel([])} noun={sel.length === 1 ? "review" : "reviews"}>
        <Button size="sm" variant="brand" loading={bulk.isPending} onClick={() => bulk.mutate("APPROVED")}>Approve</Button>
        <Button size="sm" variant="secondary" disabled={bulk.isPending} onClick={() => bulk.mutate("REJECTED")}>Reject</Button>
        <Button size="sm" variant="secondary" disabled={bulk.isPending} onClick={() => bulk.mutate("FLAGGED")}>Flag</Button>
      </BulkBar>
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this review?" description="It is removed for good and the product rating is recalculated." confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
