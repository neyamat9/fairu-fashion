import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageMeta } from "@/api/client";

export function Pagination({ meta, onPage }: { meta?: PageMeta; onPage: (p: number) => void }) {
  if (!meta || meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <div className="flex flex-col items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground sm:flex-row">
      <span>
        Showing <b className="text-foreground">{from}–{to}</b> of <b className="text-foreground">{meta.total.toLocaleString()}</b>
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page">
          <ChevronLeft />
        </Button>
        <span className="px-2">
          Page {meta.page} of {Math.max(1, meta.totalPages)}
        </span>
        <Button variant="outline" size="icon-sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Next page">
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
