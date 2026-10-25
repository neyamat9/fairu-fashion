"use client";

import { errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { addCartItem, clearCartApi, fetchCart, removeCartItem, updateCartItem } from "@/lib/services/cart.service";
import type { Cart, CartContextValue, CartItem, CartResult } from "@/lib/types";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const EMPTY: Cart = { items: [], updatedAt: "" };

export const CartContext = createContext<CartContextValue | null>(null);

/** Stable actions only — components that just add to the cart (product cards) use this so they do not re-render on every cart change. */
export const CartActionsContext = createContext<Pick<CartContextValue, "addToCart"> | null>(null);

// The cart lives on the server: for a guest under a private cart id, for a
// customer in their account (a guest cart moves into the account on login).
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const seq = useRef(0);

  const refreshCart = useCallback(async () => {
    const mine = ++seq.current;
    try {
      const c = await fetchCart();
      if (mine === seq.current) setCart(c);
    } catch {
      /* keep what we have */
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  // load on start and whenever the login changes
  useEffect(() => {
    if (authLoading) return;
    void refreshCart();
  }, [authLoading, user?.id, refreshCart]);

  // Server calls in flight. The cart is only re-read from the server once they have
  // all finished, so a slow earlier call can never overwrite a newer instant update.
  const pending = useRef(0);
  const waiters = useRef<(() => void)[]>([]);
  const cartRef = useRef<Cart>(EMPTY);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const settle = useCallback(async () => {
    if (pending.current > 0) return;
    await refreshCart();
    const w = waiters.current;
    waiters.current = [];
    w.forEach((fn) => fn());
  }, [refreshCart]);

  /** resolves once every pending call is done and the cart has been re-read */
  const whenSettled = useCallback(
    () => (pending.current === 0 ? Promise.resolve() : new Promise<void>((res) => waiters.current.push(res))),
    [],
  );

  const run = useCallback(
    async (fn: () => Promise<unknown>): Promise<CartResult> => {
      pending.current++;
      try {
        await fn();
        return { ok: true };
      } catch (e) {
        return { ok: false, error: errorMessage(e, "Could not update your cart") };
      } finally {
        pending.current--;
        await settle();
      }
    },
    [settle],
  );

  // Adding is instant: the cart updates on screen straight away and the server is told
  // in the background. If the server refuses, the cart is put right and a message shows.
  const addToCart = useCallback(
    async (p: Omit<CartItem, "id">): Promise<CartResult> => {
      const existing = cartRef.current.items.find((i) => i.productId === p.productId && i.variantId === p.variantId);
      const have = existing?.quantity ?? 0;
      if (p.stock > 0 && have + p.quantity > p.stock) {
        return { ok: false, error: have > 0 ? `Only ${p.stock} in stock (you already have ${have})` : `Only ${p.stock} in stock` };
      }
      const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setCart((c) => ({
        ...c,
        items: existing
          ? c.items.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + p.quantity } : i))
          : [...c.items, { ...p, id: tempId }],
      }));
      void run(() => addCartItem(p.productId, p.quantity, p.variantId)).then(async (r) => {
        if (r.ok) return;
        toast.error(r.error ?? "Could not add to cart");
        // `run` already re-read the cart from the server, which undoes the add. If that
        // re-read could not happen (server unreachable) the optimistic row is still on
        // screen — take it back out by hand.
        const stillThere = cartRef.current.items.find((i) => i.id === tempId || (existing && i.id === existing.id));
        if (!stillThere) return;
        const fresh = await fetchCart().catch(() => null);
        if (fresh) {
          setCart(fresh);
          return;
        }
        setCart((c) => ({
          ...c,
          items: existing
            ? c.items.map((i) => (i.id === existing.id ? { ...i, quantity: Math.max(1, i.quantity - p.quantity) } : i))
            : c.items.filter((i) => i.id !== tempId),
        }));
      });
      return { ok: true };
    },
    [run],
  );

  // A row that was just added still has a temporary id until the server answers:
  // wait for that, then act on the real row.
  const realId = useCallback(
    async (id: string): Promise<string | null> => {
      if (!id.startsWith("tmp-")) return id;
      const temp = cartRef.current.items.find((i) => i.id === id);
      await whenSettled();
      if (!temp) return null;
      return cartRef.current.items.find((i) => i.productId === temp.productId && i.variantId === temp.variantId)?.id ?? null;
    },
    [whenSettled],
  );

  const removeFromCart = useCallback(
    async (id: string) => {
      setCart((c) => ({ ...c, items: c.items.filter((i) => i.id !== id) })); // instant
      const rid = await realId(id);
      if (!rid) return { ok: true } as CartResult;
      return run(() => removeCartItem(rid));
    },
    [run, realId],
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      const q = Math.max(1, Math.min(quantity, 99));
      setCart((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, quantity: q } : i)) }));
      const rid = await realId(id);
      if (!rid) return { ok: true } as CartResult;
      return run(() => updateCartItem(rid, q));
    },
    [run, realId],
  );

  const clearCart = useCallback(async () => {
    setCart(EMPTY);
    await run(() => clearCartApi());
  }, [run]);

  const cartCount = useMemo(() => cart.items.reduce((s, i) => s + i.quantity, 0), [cart.items]);
  const cartTotal = useMemo(() => cart.items.reduce((s, i) => s + i.price * i.quantity, 0), [cart.items]);

  const value: CartContextValue = useMemo(
    () => ({
      cart, loading, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, cartCount, cartTotal,
      isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false),
    }),
    [cart, loading, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, cartCount, cartTotal, isOpen],
  );

  const actions = useMemo(() => ({ addToCart }), [addToCart]);

  return (
    <CartActionsContext.Provider value={actions}>
      <CartContext.Provider value={value}>{children}</CartContext.Provider>
    </CartActionsContext.Provider>
  );
}
