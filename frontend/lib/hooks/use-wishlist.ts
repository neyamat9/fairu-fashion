"use client";

import { WishlistContext } from "@/lib/context/WishlistContext";
import type { WishlistContextValue } from "@/lib/types";
import { useContext } from "react";

/**
 * Convenience hook for consuming WishlistContext (The Vault).
 * Must be used inside <WishlistProvider>.
 */
export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
