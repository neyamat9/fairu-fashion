import type { ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * The bar that slides up from the bottom of the screen while rows are selected:
 * "N selected · actions · ✕". It stays visible however far the list is scrolled.
 */
export function BulkBar({ count, onClear, children, noun = "selected" }: { count: number; onClear: () => void; children: ReactNode; noun?: string }) {
  if (count === 0) return null;
  return createPortal(
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 lg:left-[var(--sidebar-w,16rem)]" role="region" aria-label="Bulk actions">
      <div className="bulk-in pointer-events-auto flex max-w-full flex-wrap items-center gap-2 rounded border border-navy-700 bg-navy-800 px-3 py-2 text-white shadow-2xl dark:border-border dark:bg-card dark:text-foreground">
        <span className="px-1 text-[13px] font-semibold">
          {count} {noun}
        </span>
        <span className="hidden h-5 w-px bg-white/20 sm:block dark:bg-border" />
        <div className="flex flex-wrap items-center gap-1.5">{children}</div>
        <button type="button" onClick={onClear} aria-label="Clear selection" title="Clear selection" className="ml-1 flex size-7 cursor-pointer items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
