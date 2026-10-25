import { useState } from "react";
import { Link } from "react-router";
import { RETURN_FLOW, returnsApi, type ReturnRow, type ReturnStatus } from "@/api/care";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime, money, titleCase } from "@/lib/format";

const HELP: Partial<Record<ReturnStatus, string>> = {
  APPROVED: "The customer is told the return is accepted.",
  REJECTED: "The customer is told it was declined. Add the reason below.",
  PICKED_UP: "The courier has collected the parcel.",
  RECEIVED: "You have the item back. The returned stock goes back on the shelf.",
  REFUNDED: "Records the refund for the returned items and updates the order's payment.",
  REPLACED: "You are sending a replacement instead of money.",
};

function Detail({ r, onClose }: { r: ReturnRow; onClose: () => void }) {
  const [note, setNote] = useState("");
  const [to, setTo] = useState<ReturnStatus | null>(null);
  const move = useAct((s: ReturnStatus) => returnsApi.setStatus(r.id, s, note), { success: "Return updated", invalidate: [["returns"], ["orders"], ["attention-summary"]], onSuccess: onClose });
  const next = RETURN_FLOW[r.status];
  const total = r.items.reduce((s, i) => s + Number(i.refundAmount), 0);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Return for {r.order.orderNumber} <StatusBadge status={r.status} /></DialogTitle>
          <DialogDescription>{r.user.name} · {r.user.phone ?? r.user.email} · requested {dateTime(r.requestedAt)}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="rounded bg-muted p-3 text-[13px]"><p className="font-medium">{titleCase(r.reason)}</p>{r.detail && <p className="mt-1 text-muted-foreground">{r.detail}</p>}{r.pickupAddress && <p className="mt-1 text-xs text-muted-foreground">Pickup: {r.pickupAddress}</p>}</div>
          <ul className="divide-y divide-border rounded border border-border text-[13px]">{r.items.map((i) => <li key={i.id} className="flex justify-between px-3 py-2"><span>{i.orderItem.productName} × {i.quantity}{i.condition ? ` · ${i.condition}` : ""}</span><b>{money(i.refundAmount)}</b></li>)}<li className="flex justify-between bg-muted/50 px-3 py-2 font-semibold"><span>Refund value</span><span>{money(total)}</span></li></ul>
          {r.adminNote && <p className="text-xs text-muted-foreground">Last note: {r.adminNote}</p>}
          {next.length > 0 && (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold">Next step</p>
              <div className="flex flex-wrap gap-2">{next.map((s) => <Button key={s} size="sm" variant={s === "REJECTED" ? "outline" : to === s ? "brand" : "default"} onClick={() => setTo(s)}>{titleCase(s)}</Button>)}</div>
              {to && <p className="text-xs text-muted-foreground">{HELP[to]}</p>}
              <Field label="Note to the customer (optional)"><Textarea rows={2} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} /></Field>
            </div>
          )}
          <Link to={`/orders/${r.order.id}`} className="inline-block text-xs font-medium text-primary hover:underline">Open the order →</Link>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button>{to && <Button variant={to === "REJECTED" ? "destructive" : "brand"} loading={move.isPending} onClick={() => move.mutate(to)}>Move to {titleCase(to)}</Button>}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Returns() {
  const [f, setF] = useUrlState({ status: "", page: "1" });
  const [open, setOpen] = useState<ReturnRow | null>(null);
  const q = useInfiniteList(["returns", f.status], (page) => returnsApi.list({ status: f.status, page, limit: 20 }));
  const cols: Column<ReturnRow>[] = [
    { key: "o", header: "Order", sk: "lines2", cell: (r) => <div><p className="font-semibold">{r.order.orderNumber}</p><p className="text-[11px] text-muted-foreground">{dateTime(r.requestedAt)}</p></div> },
    { key: "c", header: "Customer", sk: "lines2", cell: (r) => <div><p className="font-medium">{r.user.name}</p><p className="text-[11px] text-muted-foreground">{r.user.phone ?? r.user.email}</p></div> },
    { key: "i", header: "Items", sk: "text", cell: (r) => <span className="max-w-[220px] truncate">{r.items[0]?.orderItem.productName}{r.items.length > 1 && ` +${r.items.length - 1}`}</span> },
    { key: "r", header: "Reason", sk: "text", cell: (r) => titleCase(r.reason) },
    { key: "v", header: "Refund value", align: "right", sk: "num", cell: (r) => money(r.items.reduce((s, i) => s + Number(i.refundAmount), 0)) },
    { key: "s", header: "Status", sk: "badge", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  return (
    <div>
      <PageHeader title="Returns" description="Return requests from customers." />
      <DataTable infinite={q} columns={cols} onRowClick={setOpen} empty={{ title: "No returns", description: "Return requests appear here." }}
        toolbar={<FilterBar><FilterSelect value={f.status} onChange={(v) => setF({ status: v })} all="All statuses" options={(["REQUESTED", "APPROVED", "PICKED_UP", "RECEIVED", "REFUNDED", "REPLACED", "REJECTED"] as const).map((s) => ({ value: s, label: titleCase(s) }))} /></FilterBar>} />
      {open && <Detail r={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
