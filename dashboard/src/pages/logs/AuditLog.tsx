import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  ChevronRight,
  Download,
} from "lucide-react";
import { logsApi, type AuditLog as AuditLogItem } from "@/api/system";
import { API_BASE } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUrlState } from "@/hooks/useUrlState";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { Select } from "@/components/ui/select";
import { SearchInput } from "@/components/shared/FilterBar";
import { dateTime, timeAgo } from "@/lib/format";

function AuditDetailModal({
  log,
  onClose,
}: {
  log: AuditLogItem;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="inline-block rounded bg-brand/15 px-2 py-0.5 font-mono text-xs font-semibold text-orange-600 dark:text-orange-400">
              {log.action}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {log.entity}
              {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
            </span>
          </div>
          <DialogTitle className="mt-2 text-base font-bold">
            Audit Record Details
          </DialogTitle>
          <DialogDescription>
            Recorded {dateTime(log.at)} ({timeAgo(log.at)})
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded border border-border bg-muted/40 p-3 space-y-1">
              <p className="font-semibold text-foreground">Admin Responsible</p>
              <p className="font-medium text-foreground">
                {log.admin?.name ?? "System Administrator"}
              </p>
              <p className="font-mono text-muted-foreground">
                {log.admin?.email ?? "—"}
              </p>
            </div>
            <div className="rounded border border-border bg-muted/40 p-3 space-y-1">
              <p className="font-semibold text-foreground">Network & Entity</p>
              <p className="text-muted-foreground font-mono">
                IP: {log.ip ?? "Unknown"}
              </p>
              <p className="text-muted-foreground font-mono">
                Target ID: {log.entityId ?? "N/A"}
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Field Differences ({log.changes?.length ?? 0} changed)
            </h4>
            {!log.changes || log.changes.length === 0 ? (
              <p className="rounded border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                No individual field diff recorded for this action.
              </p>
            ) : (
              <div className="divide-y divide-border rounded border border-border bg-card">
                {log.changes.map((c, i) => (
                  <div key={i} className="p-3 text-xs space-y-1.5">
                    <p className="font-mono font-semibold text-foreground">
                      {c.field}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded border border-destructive/20 bg-destructive/5 p-2">
                        <span className="text-[10px] font-semibold uppercase text-destructive block mb-0.5">
                          Previous Value
                        </span>
                        <pre className="font-mono text-[11px] whitespace-pre-wrap break-all text-muted-foreground">
                          {c.from === null || c.from === undefined
                            ? "null"
                            : typeof c.from === "object"
                            ? JSON.stringify(c.from, null, 2)
                            : String(c.from)}
                        </pre>
                      </div>
                      <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-2">
                        <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 block mb-0.5">
                          New Value
                        </span>
                        <pre className="font-mono text-[11px] whitespace-pre-wrap break-all text-foreground">
                          {c.to === null || c.to === undefined
                            ? "null"
                            : typeof c.to === "object"
                            ? JSON.stringify(c.to, null, 2)
                            : String(c.to)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditLog() {
  const [f, setF] = useUrlState({
    search: "",
    action: "",
    entity: "",
    page: "1",
  });
  const debouncedSearch = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [selectedAudit, setSelectedAudit] = useState<AuditLogItem | null>(null);

  const limit = 25;

  const typesQ = useQuery({
    queryKey: ["audit-types"],
    queryFn: logsApi.auditTypes,
    staleTime: 300_000,
  });

  const q = useInfiniteList(["audit-logs", debouncedSearch, f.action, f.entity], (page) =>
    logsApi.audit({
        search: debouncedSearch || undefined,
        action: f.action || undefined,
        entity: f.entity || undefined,
      page,
      limit,
    }),
  );

  const auditTypes = typesQ.data;

  const cols: Column<AuditLogItem>[] = [
    {
      key: "time",
      header: "Timestamp",
      className: "w-40",
      cell: (r) => (
        <div>
          <p className="text-xs font-medium text-foreground">{timeAgo(r.at)}</p>
          <p className="text-[11px] text-muted-foreground">{dateTime(r.at)}</p>
        </div>
      ),
    },
    {
      key: "admin",
      header: "Admin User",
      className: "w-44",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-orange-600 dark:text-orange-400">
            <User size={13} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">
              {r.admin?.name ?? "Admin"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate font-mono">
              {r.admin?.email ?? "system"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      className: "w-44",
      cell: (r) => (
        <span className="inline-block rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
          {r.action}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Target Entity",
      className: "w-40",
      cell: (r) => (
        <div>
          <span className="text-xs font-semibold text-foreground">
            {r.entity}
          </span>
          {r.entityId && (
            <p className="font-mono text-[10px] text-muted-foreground">
              #{r.entityId.slice(0, 10)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "changes",
      header: "Modifications",
      cell: (r) => {
        const count = r.changes?.length ?? 0;
        if (count === 0)
          return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-1.5 text-xs text-foreground">
            <span className="rounded bg-muted px-1.5 py-0.2 font-mono text-[11px] font-semibold">
              {count} {count === 1 ? "field" : "fields"}
            </span>
            <span className="text-muted-foreground truncate max-w-[200px]">
              ({r.changes?.map((c) => c.field).join(", ")})
            </span>
          </div>
        );
      },
    },
    {
      key: "ip",
      header: "IP",
      className: "w-28",
      cell: (r) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {r.ip ?? "—"}
        </span>
      ),
    },
    {
      key: "arrow",
      header: "",
      align: "right",
      className: "w-10",
      cell: () => <ChevronRight size={15} className="text-muted-foreground" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Immutable trail of administrative updates, entity state transitions and field mutations."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.open(`${API_BASE}/admin/audit-logs/export`, "_blank");
            }}
          >
            <Download size={15} /> Export CSV
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-xs">
        <div className="flex w-full flex-1 items-center gap-2 sm:min-w-[220px] sm:w-auto">
          <SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Search admin, entity ID or action..." className="max-w-none sm:max-w-sm" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {auditTypes?.actions && (
            <Select
              value={f.action}
              onChange={(e) => setF({ action: e.target.value })}
              className="h-8 rounded border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Actions</option>
              {auditTypes.actions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </Select>
          )}

          {auditTypes?.types && (
            <Select
              value={f.entity}
              onChange={(e) => setF({ entity: e.target.value })}
              className="h-8 rounded border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All Entities</option>
              {Object.keys(auditTypes.types).map((typeKey) => (
                <option key={typeKey} value={typeKey}>
                  {typeKey}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={cols}
        infinite={q}
        empty={{
          title: "No audit records found",
          description:
            "Audit records will be recorded when administrators update products, orders or settings.",
        }}
        onRowClick={(r) => setSelectedAudit(r)}
      />

      {/* Detail Dialog */}
      {selectedAudit && (
        <AuditDetailModal
          log={selectedAudit}
          onClose={() => setSelectedAudit(null)}
        />
      )}
    </div>
  );
}
