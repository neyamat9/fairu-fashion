import { AUTH_CHANGED_EVENT, tokens } from "@/lib/api/client";
import { getAddresses, type SavedAddress } from "@/lib/services/addresses.service";
import type { CheckoutAddress } from "@/lib/types";

/**
 * Saved addresses, kept in memory so the checkout page can open already filled in.
 * The server returns them default-first, then newest-first, so the first one is the one to prefill.
 * Wiped whenever someone signs out or the login changes (a shared computer must never show the previous person's address).
 */
let cache: { userId: string; list: SavedAddress[] } | null = null;
let inflight: Promise<SavedAddress[]> | null = null;

export function clearCheckoutPrefill() {
  cache = null;
  inflight = null;
}

if (typeof window !== "undefined") {
  window.addEventListener(AUTH_CHANGED_EVENT, clearCheckoutPrefill);
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key === "gb_uid" || e.key === "gb_access") clearCheckoutPrefill();
  });
}

/** Load the signed-in customer's saved addresses (once per login). A failure gives an empty list, never an error. */
export function loadSavedAddresses(userId: string): Promise<SavedAddress[]> {
  if (cache && cache.userId === userId) return Promise.resolve(cache.list);
  if (inflight) return inflight;
  const mine = (inflight = getAddresses()
    .then((list) => {
      if (inflight === mine && tokens.userId === userId) cache = { userId, list };
      return list;
    })
    .catch(() => [] as SavedAddress[])
    .finally(() => {
      if (inflight === mine) inflight = null;
    }));
  return mine;
}

/** What is already known without waiting (null when nothing was loaded yet). */
export function peekSavedAddresses(userId: string): SavedAddress[] | null {
  return cache && cache.userId === userId ? cache.list : null;
}

export function refreshSavedAddresses(userId: string) {
  clearCheckoutPrefill();
  return loadSavedAddresses(userId);
}

/** A saved address as the checkout form wants it. */
export function toCheckoutAddress(a: SavedAddress, email = ""): CheckoutAddress {
  return {
    fullName: a.fullName,
    phone: a.phone,
    email,
    address: a.line1,
    division: a.division ?? "",
    district: a.district ?? "",
    upazila: a.upazila ?? "",
    postalCode: a.postalCode ?? "",
  };
}
