"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
import { addToWishlist, fetchWishlist, removeFromWishlist } from "@/lib/services/wishlist.service";
import type { WishlistContextValue, WishlistItem } from "@/lib/types";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";

const GUEST_KEY = "gb_wishlist_guest";

export const WishlistContext = createContext<WishlistContextValue | null>(null);

// Customers: saved on their account. Guests: kept in this browser, then moved
// into the account the next time they log in.
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [local, setLocal] = useLocalStorage<WishlistItem[]>(GUEST_KEY, []);
  const [server, setServer] = useState<WishlistItem[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setServer([]);
      return;
    }
    let alive = true;
    (async () => {
      // move what a guest saved into the account
      if (local.length) {
        await Promise.allSettled(local.map((i) => addToWishlist(i.productId)));
        setLocal([]);
      }
      const rows = await fetchWishlist().catch(() => [] as WishlistItem[]);
      if (alive) setServer(rows);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isLoading]);

  const items = user ? server : local;

  const addToVault = useCallback(
    async (item: Omit<WishlistItem, "addedAt">) => {
      const added: WishlistItem = { ...item, addedAt: new Date().toISOString() };
      if (!user) {
        setLocal((prev) => (prev.some((i) => i.productId === item.productId) ? prev : [added, ...prev]));
        return;
      }
      setServer((prev) => (prev.some((i) => i.productId === item.productId) ? prev : [added, ...prev]));
      try {
        await addToWishlist(item.productId);
      } catch {
        setServer((prev) => prev.filter((i) => i.productId !== item.productId));
      }
    },
    [user, setLocal],
  );

  const removeFromVault = useCallback(
    async (productId: string) => {
      if (!user) {
        setLocal((prev) => prev.filter((i) => i.productId !== productId));
        return;
      }
      const before = server;
      setServer((prev) => prev.filter((i) => i.productId !== productId));
      try {
        await removeFromWishlist(productId);
      } catch {
        setServer(before);
      }
    },
    [user, server, setLocal],
  );

  const isInVault = useCallback((productId: string) => items.some((i) => i.productId === productId), [items]);

  const value: WishlistContextValue = useMemo(
    () => ({ items, addToVault, removeFromVault, isInVault, vaultCount: items.length }),
    [items, addToVault, removeFromVault, isInVault],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
