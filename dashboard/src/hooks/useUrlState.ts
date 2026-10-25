import { useCallback } from "react";
import { useSearchParams } from "react-router";

// Filters live in the URL, so a refreshed or shared page shows the same list.
export function useUrlState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const state = Object.fromEntries(Object.keys(defaults).map((k) => [k, params.get(k) ?? defaults[k]])) as T;

  const set = useCallback(
    (patch: Partial<Record<keyof T, string | number | undefined>>, resetPage = true) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === "" || v === defaults[k]) next.delete(k);
            else next.set(k, String(v));
          }
          if (resetPage && !("page" in patch)) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setParams],
  );
  return [state, set] as const;
}
