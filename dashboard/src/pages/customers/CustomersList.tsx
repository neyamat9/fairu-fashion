import { useNavigate } from "react-router";
import { X } from "lucide-react";
import { usersApi, type CustomerRow } from "@/api/users";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { DateInput, FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { SavedViews } from "@/components/shared/SavedViews";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { assetUrl } from "@/api/client";
import { dateOnly, initials, money, timeAgo } from "@/lib/format";

const D = { search: "", status: "", hasOrdered: "", registeredFrom: "", registeredTo: "", sortBy: "newest", page: "1" };

export default function CustomersList() {
  const nav = useNavigate();
  const [f, setF] = useUrlState(D);
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const params = { ...f, search, role: "USER" };
  const q = useInfiniteList(["customers", params], (page) => usersApi.list({ ...params, page, limit: 20 }));
  const filtered = !!(f.search || f.status || f.hasOrdered || f.registeredFrom || f.registeredTo);

  const cols: Column<CustomerRow>[] = [
    {
      key: "c", header: "Customer", sk: "lines2",
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9">{c.avatarUrl && <AvatarImage src={assetUrl(c.avatarUrl)} />}<AvatarFallback>{initials(c.name)}</AvatarFallback></Avatar>
          <div className="min-w-0"><p className="truncate font-medium">{c.name}</p><p className="truncate text-[11px] text-muted-foreground">{c.email}</p></div>
        </div>
      ),
    },
    { key: "phone", header: "Phone", sk: "text", cell: (c) => c.phone ?? "—" },
    { key: "status", header: "Status", sk: "badge", cell: (c) => <StatusBadge status={c.status} /> },
    { key: "orders", header: "Orders", align: "right", sk: "num", cell: (c) => c.totalOrders },
    { key: "spent", header: "Spent", align: "right", sk: "num", cell: (c) => <b>{money(c.totalSpent)}</b> },
    { key: "joined", header: "Joined", sk: "text", cell: (c) => dateOnly(c.createdAt) },
    { key: "login", header: "Last seen", sk: "text", cell: (c) => (c.lastLoginAt ? timeAgo(c.lastLoginAt) : "never") },
  ];
  return (
    <div>
      <PageHeader title="Customers" description="Everyone who has an account." actions={<><SavedViews storageKey="customers" builtIns={[{ name: "Never ordered", query: "hasOrdered=false" }, { name: "Have ordered", query: "hasOrdered=true" }, { name: "Suspended", query: "status=SUSPENDED" }]} /><DownloadButton path="/admin/users/export" params={{ search, status: f.status, role: "USER", hasOrdered: f.hasOrdered, registeredFrom: f.registeredFrom, registeredTo: f.registeredTo }} filename="customers.csv" /></>} />
      <DataTable
        infinite={q}
        columns={cols}
        onRowClick={(c) => nav(`/customers/${c.id}`)}
        empty={{ title: filtered ? "No customers match" : "No customers yet" }}
        toolbar={
          <FilterBar>
            <SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Name, email, phone…" />
            <FilterSelect value={f.status} onChange={(v) => setF({ status: v })} all="Any status" options={["ACTIVE", "SUSPENDED", "BANNED"].map((s) => ({ value: s, label: s[0] + s.slice(1).toLowerCase() }))} />
            <FilterSelect value={f.hasOrdered} onChange={(v) => setF({ hasOrdered: v })} all="Ordered or not" options={[{ value: "true", label: "Has ordered" }, { value: "false", label: "Never ordered" }]} />
            <FilterSelect value={f.sortBy} onChange={(v) => setF({ sortBy: v })} all={null} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "name", label: "Name A–Z" }, { value: "spent", label: "Top spenders" }, { value: "orders", label: "Most orders" }, { value: "last-login", label: "Recently active" }]} />
            <DateInput label="Joined from" value={f.registeredFrom} onChange={(v) => setF({ registeredFrom: v })} />
            <DateInput label="to" value={f.registeredTo} onChange={(v) => setF({ registeredTo: v })} />
            {filtered && <Button size="sm" variant="ghost" onClick={() => { setF({ search: "", status: "", hasOrdered: "", registeredFrom: "", registeredTo: "" }); }}><X /> Clear</Button>}
          </FilterBar>
        }
      />
    </div>
  );
}
