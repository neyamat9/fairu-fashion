"use client";

import { CartActionsContext, CartContext } from "@/lib/context/CartContext";
import type { CartContextValue } from "@/lib/types";
import { useContext } from "react";

/**
 * Convenience hook for consuming CartContext.
 * Must be used inside <CartProvider>.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

/** Just `addToCart` — never causes a re-render when the cart changes. */
export function useCartActions() {
  const context = useContext(CartActionsContext);
  if (!context) throw new Error("useCartActions must be used within a CartProvider");
  return context;
}
