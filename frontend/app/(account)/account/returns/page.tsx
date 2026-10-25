"use client";

import RequireLogin from "@/components/account/RequireLogin";
import { card, EmptyState, formatDate, PageHeading, Skeleton } from "@/components/account/ui";
import { errorMessage } from "@/lib/api/client";
import { cancelReturn, getReturns, type ReturnRequest } from "@/lib/services/support.service";
import { AlertTriangle, MessageSquareText, Package, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const LABEL: Record<string, string> = { REQUESTED: "Requested", APPROVED: "Approved", REJECTED: "Declined", PICKED_UP: "Picked up", RECEIVED: "Received", REFUNDED: "Refunded", REPLACED: "Replaced" };
const TONE: Record<string, string> = {
  REQUESTED: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  APPROVED: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  REJECTED: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  PICKED_UP: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  RECEIVED: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  REFUNDED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  REPLACED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};
const REASON = (r: string) => r.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

function Returns() {
  const [rows, setRows] = useState<ReturnRequest[] | null>(null);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const load = useCallback(() => {
    getReturns().then(setRows).catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  async function cancel(id: string) {
    try {
      await cancelReturn(id);
      toast.success("Return request cancelled");
      setConfirm(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <>
      <PageHeading
        title="My"
        accent="returns"
        subtitle={
          <>
            To return something, open a delivered order from <Link href="/orders" className="font-bold text-accent-text hover:underline">My orders</Link>.
          </>
        }
      />
      {error ? (
        <div className={`${card} flex items-center gap-3 p-5 text-sm font-medium text-destructive`} role="alert">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          Could not load your returns. Please refresh the page.
        </div>
      ) : rows === null ? (
        <div className="space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={RotateCcw} title="No return requests" text="If something isn't right with a delivered order, you can request a return from the order page." action={{ href: "/orders", label: "Go to my orders" }} />
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className={`${card} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/50 px-4 py-3 sm:px-5">
                <div>
                  <p className="font-mono text-sm font-bold text-foreground">Order {r.order?.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested {formatDate(r.requestedAt)} · {REASON(r.reason)}
                  </p>
                </div>
                <span className={`rounded border px-2.5 py-1 text-[11px] font-bold ${TONE[r.status] ?? "border-border bg-secondary text-foreground"}`}>{LABEL[r.status] ?? r.status}</span>
              </div>
              <div className="p-4 sm:p-5">
                <ul className="space-y-1.5">
                  {r.items.map((i) => (
                    <li key={i.id} className="flex items-center gap-2.5 text-sm text-foreground">
                      <Package className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{i.orderItem?.productName ?? "Item"}</span>
                      <span className="font-semibold text-muted-foreground">× {i.quantity}</span>
                    </li>
                  ))}
                </ul>
                {r.adminNote && (
                  <p className="mt-4 flex items-start gap-2 rounded border border-border bg-background px-3 py-2.5 text-sm text-foreground/85">
                    <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <span>
                      <b>Note from us:</b> {r.adminNote}
                    </span>
                  </p>
                )}
                {r.status === "REQUESTED" && (
                  <div className="mt-4 flex justify-end">
                    {confirm === r.id ? (
                      <span className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-foreground">Cancel this request?</span>
                        <button type="button" onClick={() => cancel(r.id)} className="rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
                          Yes, cancel
                        </button>
                        <button type="button" onClick={() => setConfirm(null)} className="rounded px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary">
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirm(r.id)} className="text-sm font-bold text-red-700 hover:underline dark:text-red-300">
                        Cancel request
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function ReturnsPage() {
  return (
    <RequireLogin>
      <Returns />
    </RequireLogin>
  );
}
