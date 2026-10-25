import { useNavigate } from "react-router";
import { ticketsApi, type Ticket, type TicketStatus } from "@/api/care";
import { QuickStatus, type QuickOption } from "@/components/shared/QuickStatus";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { Badge } from "@/components/ui/badge";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { timeAgo, titleCase } from "@/lib/format";

export const PRIORITY_VARIANT = { low: "neutral", normal: "info", high: "warning", urgent: "danger" } as const;

const TICKET_STATUSES: QuickOption<TicketStatus>[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING_CUSTOMER", label: "Waiting for customer" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Close ticket", confirm: "Close this ticket?" },
];

export default function Support() {
  const nav = useNavigate();
  const [f, setF] = useUrlState({ search: "", status: "", priority: "", category: "", needsReply: "", page: "1" });
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const q = useInfiniteList(["tickets", search, f.status, f.priority, f.category, f.needsReply], (page) => ticketsApi.list({ search, status: f.status, priority: f.priority, category: f.category, needsReply: f.needsReply, page, limit: 20 }));
  const counts = q.first?.counts ?? {};
  const move = useAct((v: { id: string; status: TicketStatus }) => ticketsApi.update(v.id, { status: v.status }), { success: "Ticket updated", invalidate: [["tickets"]] });
  const cols: Column<Ticket>[] = [
    { key: "t", header: "Ticket", sk: "lines2", cell: (t) => <div className="max-w-[360px]"><p className="font-semibold">{t.ticketNumber}</p><p className="truncate text-[13px]">{t.subject}</p></div> },
    { key: "c", header: "Customer", sk: "lines2", cell: (t) => <div><p className="font-medium">{t.submittedBy.name}</p><p className="text-[11px] text-muted-foreground">{t.submittedBy.phone ?? t.submittedBy.email}</p></div> },
    { key: "cat", header: "Category", sk: "text", cell: (t) => titleCase(t.category) },
    { key: "p", header: "Priority", sk: "badge", cell: (t) => <Badge variant={PRIORITY_VARIANT[t.priority]}>{titleCase(t.priority)}</Badge> },
    { key: "s", header: "Status", sk: "badge", cell: (t) => <QuickStatus current={t.status} options={TICKET_STATUSES} pending={move.isPending && move.variables?.id === t.id} onPick={(status) => move.mutate({ id: t.id, status })} /> },
    { key: "m", header: "Msgs", align: "right", sk: "num", cell: (t) => t.messageCount ?? "—" },
    { key: "l", header: "Last activity", sk: "text", cell: (t) => timeAgo(t.lastMessageAt) },
  ];
  return (
    <div>
      <PageHeader title="Support tickets" description="Conversations with customers who need help." />
      <DataTable infinite={q} columns={cols} onRowClick={(t) => nav(`/support/${t.id}`)} empty={{ title: "No tickets" }}
        toolbar={<FilterBar>
          <SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Ticket #, subject, customer…" />
          <FilterSelect value={f.status} onChange={(v) => setF({ status: v })} all="All statuses" options={["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"].map((s) => ({ value: s, label: `${titleCase(s)}${counts[s] ? ` (${counts[s]})` : ""}` }))} />
          <FilterSelect value={f.priority} onChange={(v) => setF({ priority: v })} all="Any priority" options={["urgent", "high", "normal", "low"].map((s) => ({ value: s, label: titleCase(s) }))} />
          <FilterSelect value={f.category} onChange={(v) => setF({ category: v })} all="Any category" options={["ORDER", "PAYMENT", "DELIVERY", "RETURN_WARRANTY", "PRODUCT", "ACCOUNT", "OTHER"].map((s) => ({ value: s, label: titleCase(s) }))} />
          <FilterSelect value={f.needsReply} onChange={(v) => setF({ needsReply: v })} all="All" options={[{ value: "true", label: "Waiting for my reply" }]} />
        </FilterBar>} />
    </div>
  );
}
