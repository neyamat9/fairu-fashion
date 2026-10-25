import { useEffect, useRef, type ReactNode } from "react";
import type * as React from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/api/client";
import { EmptyState, ErrorState } from "./EmptyState";
import { Pagination } from "./Pagination";
import type { PageMeta } from "@/api/client";
import type { InfiniteList } from "@/hooks/useInfiniteList";

/**
 * How a column shows up in the phone card layout (below 768px):
 *  title – the big first line · badge – next to the title (status chips) · end – under the facts, e.g. price/total
 *  meta (default) – small "label: value" facts · hide – only on the big table
 */
export type MobileSlot = "title" | "badge" | "end" | "meta" | "hide" | "action";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: "right" | "center";
  mobile?: MobileSlot;
  /** label shown in the phone card for `meta` columns (defaults to the header when it is plain text) */
  mobileLabel?: string;
  /** what the placeholder looks like while loading: the same shape as this column's cell */
  sk?: SkKind;
}

export type SkKind = "text" | "lines2" | "badge" | "badge2" | "num" | "thumb2" | "stock" | "icon" | "btn" | "none";

/** One loading placeholder shaped like a real cell (sizes match the real content so the row height does not change). */
export function SkCell({ kind = "text", align }: { kind?: SkKind; align?: "right" | "center" }) {
  const wrap = (n: React.ReactNode) => <div className={cn("flex", align === "right" && "justify-end", align === "center" && "justify-center")}>{n}</div>;
  switch (kind) {
    case "none":
      return null;
    case "badge":
      return wrap(<Skeleton className="h-5 w-[72px]" />);
    case "badge2":
      return (
        <div className="flex flex-col items-start gap-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      );
    case "num":
      return wrap(<Skeleton className="h-4 w-12" />);
    case "icon":
      return wrap(<Skeleton className="size-8" />);
    case "btn":
      return wrap(<Skeleton className="h-6 w-[72px]" />);
    case "lines2":
      return (
        <div>
          <div className="flex h-5 items-center">
            <Skeleton className="h-3.5 w-32 max-w-full" />
          </div>
          <div className="flex h-4 items-center">
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      );
    case "thumb2":
      return (
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-44 max-w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      );
    case "stock":
      return (
        <div className="flex flex-col items-end gap-0.5">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-5 w-16" />
        </div>
      );
    default:
      return wrap(<Skeleton className="h-4 w-24 max-w-full" />);
  }
}

const rid = (r: unknown): string => String((r as { id?: string }).id ?? "");

function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    if (p.tagName === "MAIN") return p;
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** Loads the next page when the invisible marker under the list gets near the viewport */
export function LoadMore({ list, root }: { list: Pick<InfiniteList<unknown>, "hasNextPage" | "isFetchingNextPage" | "fetchNextPage" | "isError">; root?: Element | null }) {
  const mark = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError } = list;

  useEffect(() => {
    const el = mark.current;
    // re-armed after every page lands, so a short page that still leaves the marker in view keeps loading
    if (!el || !hasNextPage || isError || isFetchingNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { root: root ?? scrollParent(el), rootMargin: "0px 0px 400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isError, isFetchingNextPage, fetchNextPage, root]);

  return <div ref={mark} aria-hidden="true" className="h-px" />;
}

/** The loader marker + "Showing N of total / Loading more… / Retry" line under an infinitely scrolling list */
export function InfiniteFooter({ list }: { list: Pick<InfiniteList<unknown>, "rows" | "total" | "hasNextPage" | "isFetchingNextPage" | "fetchNextPage" | "isError"> }) {
  return (
    <>
      <LoadMore list={list} />
      <div className="flex min-h-11 items-center justify-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground" aria-live="polite">
        {list.isError ? (
          <>
            <span className="text-destructive">Could not load more.</span>
            <Button size="xs" variant="outline" onClick={list.fetchNextPage}>
              Retry
            </Button>
          </>
        ) : list.isFetchingNextPage ? (
          <>
            <Loader2 className="size-3.5 animate-spin" /> Loading more…
          </>
        ) : list.hasNextPage ? (
          <span>
            Showing <b className="text-foreground">{list.rows.length.toLocaleString()}</b> of <b className="text-foreground">{list.total.toLocaleString()}</b>
          </span>
        ) : (
          <span>{list.total > 1 ? `All ${list.total.toLocaleString()} shown` : "End of list"}</span>
        )}
      </div>
    </>
  );
}

const plainHeader = (h: ReactNode, fallback: string) => (typeof h === "string" && h ? h : fallback);

export function DataTable<T extends object>({
  columns,
  rows,
  loading,
  error,
  onRetry,
  meta,
  onPage,
  infinite,
  empty,
  onRowClick,
  selectable,
  selected,
  onSelect,
  rowKey,
  toolbar,
  renderCard,
  rowClassName,
}: {
  columns: Column<T>[];
  rows?: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** numbered pages (old style); prefer `infinite` */
  meta?: PageMeta;
  onPage?: (p: number) => void;
  /** infinite scrolling: pass the result of useInfiniteList */
  infinite?: InfiniteList<T>;
  empty?: { title?: string; description?: string; action?: ReactNode };
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelect?: (ids: string[]) => void;
  rowKey?: (row: T, i: number) => string;
  toolbar?: ReactNode;
  /** custom phone card; the default is built from the columns' `mobile` slots */
  renderCard?: (row: T) => ReactNode;
  rowClassName?: (row: T) => string | undefined;
}) {
  const data = infinite ? infinite.rows : rows;
  const isLoading = infinite ? infinite.isLoading : loading;
  const ids = (data ?? []).map((r) => rid(r)).filter(Boolean);
  const allSelected = selectable && ids.length > 0 && ids.every((id) => selected?.includes(id));
  const toggleAll = (on: boolean) => onSelect?.(on ? Array.from(new Set([...(selected ?? []), ...ids])) : (selected ?? []).filter((id) => !ids.includes(id)));
  const toggleOne = (id: string, on: boolean) => id && onSelect?.(on ? [...(selected ?? []), id] : (selected ?? []).filter((x) => x !== id));
  const err = infinite ? (infinite.isError && infinite.rows.length === 0 ? errorMessage(infinite.error) : null) : error;
  const retry = infinite ? infinite.refetch : onRetry;

  // pages may set `mobile` per column; otherwise status-like columns become chips beside the title and the unlabeled actions column goes to the bottom
  const slot = (c: Column<T>): MobileSlot =>
    c.mobile ?? (c.header === "" ? "action" : typeof c.header === "string" && /^(status|state|priority|level)$/i.test(c.header) ? "badge" : "meta");
  const titleCol = columns.find((c) => slot(c) === "title") ?? columns.find((c) => slot(c) !== "hide");
  const badgeCols = columns.filter((c) => c !== titleCol && slot(c) === "badge");
  const endCols = columns.filter((c) => c !== titleCol && slot(c) === "end");
  const metaCols = columns.filter((c) => c !== titleCol && slot(c) === "meta");
  const actionCols = columns.filter((c) => c !== titleCol && slot(c) === "action");

  const card = (row: T, i: number) => {
    const id = rid(row);
    return (
      <li
        key={rowKey ? rowKey(row, i) : id || i}
        className={cn("row-enter relative flex gap-3 px-3 py-3 transition-colors active:bg-muted/60", onRowClick && "cursor-pointer", rowClassName?.(row))}
        style={{ animationDelay: `${Math.min(i % 30, 8) * 22}ms` }}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
      >
        {selectable && (
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
            <Checkbox checked={!!id && !!selected?.includes(id)} onChange={(e) => toggleOne(id, e.target.checked)} aria-label="Select row" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {renderCard ? (
            renderCard(row)
          ) : (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 text-sm font-semibold">{titleCol?.cell(row)}</div>
                {badgeCols.length > 0 && (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {badgeCols.map((c) => (
                      <span key={c.key}>{c.cell(row)}</span>
                    ))}
                  </div>
                )}
                {actionCols.length > 0 && (
                  <div className="-mr-1 -mt-1 flex shrink-0 items-center">
                    {actionCols.map((c) => (
                      <span key={c.key}>{c.cell(row)}</span>
                    ))}
                  </div>
                )}
              </div>
              {metaCols.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] min-[480px]:grid-cols-3">
                  {metaCols.map((c) => (
                    <div key={c.key} className="min-w-0">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.mobileLabel ?? plainHeader(c.header, c.key)}</dt>
                      <dd className="min-w-0 break-words [&_*]:!text-left [&>div]:!items-start">{c.cell(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {endCols.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-2 text-sm">
                  {endCols.map((c) => (
                    <span key={c.key} className={cn(c.header === "" && "ml-auto")}>
                      {c.cell(row)}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </li>
    );
  };

  return (
    <Card className="overflow-hidden">
      {toolbar}
      {err ? (
        <ErrorState message={err} onRetry={retry} />
      ) : (
        <>
          {/* phones & small tablets: one small card per row */}
          <ul className="divide-y divide-border md:hidden">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <li key={i} className="flex gap-3 px-3 py-3" aria-hidden="true">
                    {selectable && <Skeleton className="mt-0.5 size-4 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">{titleCol && <SkCell kind={titleCol.sk === "thumb2" ? "thumb2" : "lines2"} />}</div>
                        {badgeCols.length > 0 && (
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {badgeCols.map((c) => (
                              <span key={c.key}>
                                <span className="inline-flex h-5 w-[72px] animate-pulse rounded bg-muted-foreground/15" />
                              </span>
                            ))}
                          </div>
                        )}
                        {actionCols.length > 0 && <Skeleton className="-mr-1 -mt-1 h-6 w-[72px] shrink-0" />}
                      </div>
                      {metaCols.length > 0 && (
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[12px] min-[480px]:grid-cols-3">
                          {metaCols.map((c) => (
                            <div key={c.key} className="min-w-0">
                              <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{c.mobileLabel ?? plainHeader(c.header, c.key)}</dt>
                              <dd className="flex min-h-[18px] min-w-0 items-center [&_div]:!items-start [&_div]:!justify-start">
                                <SkCell kind={c.sk ?? "text"} />
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {endCols.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-2">
                          {endCols.map((c) => (
                            <Skeleton key={c.key} className={c.sk === "badge2" ? "h-5 w-24" : "h-5 w-16"} />
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))
              : (data ?? []).map(card)}
          </ul>

          {/* tablets and up: the real table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {selectable && (
                    <TableHead className="w-9">
                      <Checkbox checked={!!allSelected} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all" />
                    </TableHead>
                  )}
                  {columns.map((c) => (
                    <TableHead key={c.key} className={cn(c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>
                      {c.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i} className="hover:bg-transparent" aria-hidden="true">
                        {selectable && (
                          <TableCell>
                            <Skeleton className="size-4" />
                          </TableCell>
                        )}
                        {columns.map((c) => (
                          <TableCell key={c.key} className={cn(c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>
                            <SkCell kind={c.sk ?? (c.header === "" ? "icon" : "text")} align={c.align} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (data ?? []).map((row, i) => (
                      <TableRow
                        key={rowKey ? rowKey(row, i) : rid(row) || i}
                        className={cn("row-enter", onRowClick && "cursor-pointer", rowClassName?.(row))}
                        style={{ animationDelay: `${Math.min(i % 30, 8) * 22}ms` }}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                      >
                        {selectable && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={!!rid(row) && !!selected?.includes(rid(row))} onChange={(e) => toggleOne(rid(row), e.target.checked)} aria-label="Select row" />
                          </TableCell>
                        )}
                        {columns.map((c) => (
                          <TableCell key={c.key} className={cn(c.align === "right" && "text-right", c.align === "center" && "text-center", c.className)}>
                            {c.cell(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {!isLoading && !err && (data?.length ?? 0) === 0 && <EmptyState {...empty} />}

      {infinite && !err && (data?.length ?? 0) > 0 && <InfiniteFooter list={infinite} />}
      {!infinite && onPage && <Pagination meta={meta} onPage={onPage} />}
    </Card>
  );
}
