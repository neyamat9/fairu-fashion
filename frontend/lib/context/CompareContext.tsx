"use client";

import type { CompareContextValue, Product } from "@/lib/types";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";

export const MAX_COMPARE = 3;
const KEY = "gb_compare";

export const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  // The list is remembered in this browser (so a reload or another tab keeps it); at most 3 products.
  const [compareList, setCompareList] = useState<Product[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const list = JSON.parse(raw) as Product[];
        if (Array.isArray(list)) setCompareList(list.filter((p) => p && p.id && p.slug).slice(0, MAX_COMPARE));
      }
    } catch {
      /* storage blocked or corrupt: start empty */
    }
    hydrated.current = true;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      try {
        setCompareList(e.newValue ? (JSON.parse(e.newValue) as Product[]).slice(0, MAX_COMPARE) : []);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (compareList.length) localStorage.setItem(KEY, JSON.stringify(compareList));
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked */
    }
  }, [compareList]);

  const replaceCompare = useCallback((products: Product[]) => {
    const seen = new Set<string>();
    setCompareList(products.filter((p) => !seen.has(p.id) && seen.add(p.id)).slice(0, MAX_COMPARE));
  }, []);

  const addToCompare = useCallback((product: Product) => {
    setCompareList((prev) => {
      // Already in list — no-op (caller should show toast for max-3 case)
      if (prev.some((p) => p.id === product.id)) return prev;
      // At capacity — no-op (caller is responsible for showing the toast)
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, product];
    });
  }, []);

  const removeFromCompare = useCallback((productId: string) => {
    setCompareList((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const isInCompare = useCallback(
    (productId: string) => compareList.some((p) => p.id === productId),
    [compareList]
  );

  const value: CompareContextValue = useMemo(
    () => ({
      compareList,
      addToCompare,
      removeFromCompare,
      clearCompare,
      replaceCompare,
      isInCompare,
    }),
    [compareList, addToCompare, removeFromCompare, clearCompare, replaceCompare, isInCompare]
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}
