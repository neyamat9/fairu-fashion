import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import type { Paged } from "@/api/client";

type Row<P extends Paged<unknown>> = P["data"][number];

const idOf = (r: unknown): string | undefined => {
  const id = (r as { id?: unknown })?.id;
  return id === undefined || id === null ? undefined : String(id);
};

/**
 * A list that keeps loading the next page as you scroll.
 * `fetcher(page)` answers the API's usual `{ data, meta }`; put every filter in `key` so a new filter starts again at page 1.
 */
export function useInfiniteList<P extends Paged<unknown>>(key: readonly unknown[], fetcher: (page: number) => Promise<P>, opts?: { enabled?: boolean; refetchInterval?: number }) {
  const q = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetcher(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
    enabled: opts?.enabled,
    refetchInterval: opts?.refetchInterval,
  });

  const rows = useMemo(() => {
    // a new row at the top shifts later pages, so the same row can come twice: keep the first
    const seen = new Set<string>();
    const out: Row<P>[] = [];
    for (const p of q.data?.pages ?? []) {
      for (const r of p.data) {
        const id = idOf(r);
        if (id) {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        out.push(r as Row<P>);
      }
    }
    return out;
  }, [q.data]);

  const total = q.data?.pages[q.data.pages.length - 1]?.meta.total ?? 0;

  return {
    rows,
    total,
    /** the newest copy of page 1, for the extras some lists send next to data/meta (counts, stats…) */
    first: q.data?.pages[0] as P | undefined,
    isLoading: q.isLoading,
    isError: q.isError,
    error: q.error,
    isFetching: q.isFetching,
    isPlaceholder: q.isPlaceholderData,
    hasNextPage: !!q.hasNextPage,
    isFetchingNextPage: q.isFetchingNextPage,
    fetchNextPage: () => void q.fetchNextPage(),
    refetch: () => void q.refetch(),
  };
}

export type InfiniteList<T> = Pick<ReturnType<typeof useInfiniteList<Paged<T>>>, "rows" | "total" | "isLoading" | "isError" | "error" | "isFetching" | "hasNextPage" | "isFetchingNextPage" | "fetchNextPage" | "refetch">;

/**
 * Change one row in every cached copy of a list right away (optimistic update) without refetching all loaded pages.
 * Returns a function that puts the old rows back, for when the server says no.
 */
export function patchListRows(qc: QueryClient, key: readonly unknown[], id: string, patch: Record<string, unknown>) {
  const snapshots = qc.getQueriesData<InfiniteData<Paged<unknown>>>({ queryKey: key });
  for (const [k, data] of snapshots) {
    if (!data?.pages) continue;
    qc.setQueryData<InfiniteData<Paged<unknown>>>(k, {
      ...data,
      pages: data.pages.map((pg) => ({ ...pg, data: pg.data.map((r) => (idOf(r) === id ? { ...(r as object), ...patch } : r)) })),
    });
  }
  return () => {
    for (const [k, data] of snapshots) qc.setQueryData(k, data);
  };
}
