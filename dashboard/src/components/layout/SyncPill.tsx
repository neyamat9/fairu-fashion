import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { storefrontApi } from "@/api/storefront";
import { errorMessage } from "@/api/client";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Header pill that says whether the shop is in step with the admin: "Live" when the last change reached it,
 * "Syncing…" while it is on its way, a red "Retry" when the shop could not be reached.
 */
export function SyncPill() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["storefront-sync"], queryFn: storefrontApi.sync, refetchInterval: (query) => (query.state.data?.pending ? 2_000 : 30_000), staleTime: 0 });
  const publish = useMutation({
    mutationFn: storefrontApi.publish,
    onSuccess: (d) => {
      qc.setQueryData(["storefront-sync"], d);
      if (d.last?.ok) toast.success("The shop is up to date");
      else toast.error(d.last?.error ?? "The shop could not be reached");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  // after an admin save, look again soon (the push goes out ~0.5s later) and say so when it lands
  useEffect(() => {
    const ids: number[] = [];
    const unsub = qc.getMutationCache().subscribe((e) => {
      if (e.type === "updated" && e.action.type === "success" && e.mutation.options.mutationKey === undefined) {
        ids.push(window.setTimeout(() => void qc.invalidateQueries({ queryKey: ["storefront-sync"] }), 1200), window.setTimeout(() => void qc.invalidateQueries({ queryKey: ["storefront-sync"] }), 3500));
      }
    });
    return () => {
      unsub();
      ids.forEach(clearTimeout);
    };
  }, [qc]);

  const seen = useRef<string | null | undefined>(undefined);
  const lastAt = q.data?.last?.at ?? null;
  const loaded = !!q.data;
  useEffect(() => {
    if (!loaded) return;
    if (seen.current === undefined) {
      seen.current = lastAt; // first look: nothing to announce
      return;
    }
    if (lastAt && lastAt !== seen.current && q.data?.last?.ok) toast.success("Live on the shop", { duration: 2200 });
    seen.current = lastAt;
  }, [loaded, lastAt, q.data?.last?.ok]);

  const s = q.data;
  if (!s) return <span className="hidden h-7 w-20 animate-pulse rounded bg-muted md:block" aria-hidden="true" />;

  const failed = s.configured && s.last && !s.last.ok;
  const syncing = s.configured && (s.pending || publish.isPending || (!!s.lastChange && (!s.last || s.lastChange > s.last.at)));

  if (!s.configured) {
    return (
      <span title="REVALIDATE_SECRET is not set on the server, so the shop only refreshes on its own timer" className="hidden items-center gap-1.5 rounded border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground md:inline-flex">
        <CloudOff className="size-3.5" /> Sync off
      </span>
    );
  }
  if (failed) {
    return (
      <button type="button" onClick={() => publish.mutate()} title={s.last?.error} className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
        <RefreshCw className="size-3.5" /> <span className="hidden sm:inline">Shop not updated ·</span> Retry
      </button>
    );
  }
  return (
    <span
      title={s.last ? `The shop was last refreshed ${timeAgo(s.last.at)}` : "Nothing has changed since the server started"}
      className={cn("inline-flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-medium", syncing ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" : "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200")}
    >
      {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
      <span className="hidden sm:inline">{syncing ? "Updating shop…" : s.last ? `Shop live · ${timeAgo(s.last.at)}` : "Shop live"}</span>
    </span>
  );
}
