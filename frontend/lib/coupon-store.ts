// The coupon a customer applied in the cart drawer, remembered across pages and
// tabs so the checkout starts with it. It is only a *code*: every discount shown
// is worked out and re-validated by the server against the live cart.

const KEY = "gb_coupon";
export const COUPON_EVENT = "gb:coupon-changed";

/** Letters, digits, dash and underscore; 2–40 chars. */
export const COUPON_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,39}$/;

export function normalizeCoupon(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase().slice(0, 40);
}

export function getStoredCoupon(): string {
  if (typeof window === "undefined") return "";
  try {
    const v = normalizeCoupon(window.localStorage.getItem(KEY) ?? "");
    return COUPON_PATTERN.test(v) ? v : "";
  } catch {
    return "";
  }
}

export function storeCoupon(code: string) {
  if (typeof window === "undefined") return;
  try {
    if (code) window.localStorage.setItem(KEY, code);
    else window.localStorage.removeItem(KEY);
  } catch {
    /* private mode etc. — the coupon just won't persist */
  }
  window.dispatchEvent(new CustomEvent(COUPON_EVENT, { detail: code }));
}

export function clearStoredCoupon() {
  storeCoupon("");
}

export { KEY as COUPON_STORAGE_KEY };
