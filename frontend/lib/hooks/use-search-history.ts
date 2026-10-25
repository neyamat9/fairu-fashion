"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { clearSearchHistory, getSearchHistory, recordSearch, removeSearch, type SearchHistoryItem } from "@/lib/services/search-history.service";
import { useCallback, useEffect, useState } from "react";

const SHOWN = 4;

/**
 * The signed-in customer's latest searches (newest first), for the header search box.
 * Signed out → always empty and nothing is saved. Everything is optimistic: the list changes at once, the server catches up.
 */
export function useSearchHistory() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState<SearchHistoryItem[]>([]);

  // load for the signed-in customer; empty the moment they sign out or someone else signs in
  useEffect(() => {
    setItems([]);
    if (!userId) return;
    let alive = true;
    getSearchHistory()
      .then((l) => alive && setItems(l.slice(0, SHOWN)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [userId]);

  const record = useCallback(
    (raw: string) => {
      const term = raw.replace(/\s+/g, " ").trim();
      if (!userId || term.length < 2 || term.length > 60) return;
      setItems((prev) => [{ id: `local-${term.toLowerCase()}`, term }, ...prev.filter((i) => i.term.toLowerCase() !== term.toLowerCase())].slice(0, SHOWN));
      recordSearch(term)
        .then((l) => setItems(l.slice(0, SHOWN)))
        .catch(() => {});
    },
    [userId],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (!id.startsWith("local-")) removeSearch(id).then((l) => setItems(l.slice(0, SHOWN))).catch(() => {});
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    clearSearchHistory().catch(() => {});
  }, []);

  return { items, record, remove, clear };
}
