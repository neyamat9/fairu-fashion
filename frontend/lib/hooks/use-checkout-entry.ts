"use client";

import { useAuthModal } from "@/components/auth/AuthModal";
import { startNavigation } from "@/components/layout/NavigationGate";
import { loadSavedAddresses } from "@/lib/checkout-prefill";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export type CheckoutEntryState = "loading" | "signed-out" | "signed-in";

/**
 * The checkout button (cart drawer and cart page), in one place:
 *  - while we don't yet know who the customer is → disabled;
 *  - signed out → "Log in to checkout": opens the sign-in modal and carries on to checkout afterwards;
 *  - signed in → loads the saved addresses first (so the checkout opens already filled in), then opens checkout.
 * `beforeLeave` runs right before the page changes (e.g. close the cart drawer).
 */
export function useCheckoutEntry(beforeLeave?: () => void) {
  const { user, isLoading } = useAuth();
  const { openAuth } = useAuthModal();
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const state: CheckoutEntryState = isLoading ? "loading" : user ? "signed-in" : "signed-out";

  const go = useCallback(async () => {
    if (state === "loading" || checking) return;
    if (!user) {
      beforeLeave?.();
      openAuth("login", { then: "/checkout" });
      return;
    }
    setChecking(true);
    try {
      // a short wait at most: never hold the sale back for a slow address request
      await Promise.race([loadSavedAddresses(user.id), new Promise((r) => setTimeout(r, 2500))]);
    } finally {
      setChecking(false);
    }
    beforeLeave?.();
    startNavigation("/checkout");
    router.push("/checkout");
  }, [state, checking, user, beforeLeave, openAuth, router]);

  return { state, checking, go };
}
