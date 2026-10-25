"use client";

import { GenericSkeleton, HomeSkeleton, ListingSkeleton, ProductPageSkeleton } from "@/components/skeletons/PageSkeletons";
import { scrollTopNow } from "@/components/motion/scroll-top";
import { AccountContentSkeleton, AccountPageSkeleton, isAccountPath } from "@/components/skeletons/AccountSkeletons";
import CompareSkeleton from "@/components/skeletons/CompareSkeleton";
import { CartBodySkeleton, CheckoutBodySkeleton, CheckoutOverlaySkeleton } from "@/components/skeletons/CheckoutSkeletons";
import { tokens } from "@/lib/api/client";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";

/** Tell the gate a navigation is starting (for code that calls router.push instead of clicking a link). */
export function startNavigation(href: string) {
  window.dispatchEvent(new CustomEvent("nav:start", { detail: href }));
}

const isCheckoutPath = (p: string) => p === "/cart" || p === "/checkout";

/** `fromAccount` / `fromCheckout`: the click happened inside that area, where its menu / header is already on screen (only the content is replaced). */
function skeletonFor(href: string, fromAccount: boolean, fromCheckout: boolean) {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/") return <HomeSkeleton />;
  if (path === "/compare") return <CompareSkeleton />;
  // the cart and checkout have their own focused header, so their skeleton is a full screen of its own
  if (isCheckoutPath(path)) {
    if (fromCheckout) return path === "/cart" ? <CartBodySkeleton /> : <CheckoutBodySkeleton />;
    return <CheckoutOverlaySkeleton path={path} />;
  }
  if (isAccountPath(path)) {
    if (fromAccount) return <AccountContentSkeleton path={path} />;
    // coming from the storefront: the whole account page (menu + content), exactly as it will look. A visitor who is not signed in gets no menu.
    return <AccountPageSkeleton path={path} withMenu={!!tokens.access} />;
  }
  if (/^\/products\/[^/]+$/.test(path)) return <ProductPageSkeleton />;
  if (path === "/products" || path.startsWith("/category/") || path.startsWith("/brand/") || path === "/search") return <ListingSkeleton />;
  return <GenericSkeleton />;
}

/** Clears the pending state the moment the address actually changes (the new page has been committed). */
function RouteDone({ onDone }: { onDone: () => void }) {
  const path = usePathname();
  const qs = useSearchParams().toString();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, qs]);
  return null;
}

/**
 * Instant navigation. When a link is clicked and the next page is not ready within a blink (SKELETON_DELAY),
 * the destination's skeleton replaces the page on screen — no staring at the old page while the server works.
 * A page that is already in the browser's cache (visited before, or prefetched) is ready before that, so it simply
 * appears with its data and the skeleton never flashes. Once the new page arrives (the URL changes), the real page,
 * which starts with its own loading skeleton, takes over.
 * The old page stays mounted (just hidden) so nothing is lost if navigation is cancelled.
 */
const SKELETON_DELAY = 120;

export default function NavigationGate({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<{ href: string; fromAccount: boolean; fromCheckout: boolean } | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const begin = (href: string) => {
      const here = window.location.pathname + window.location.search;
      if (href === here) return;
      // (no scroll to the top here: the old page must not jump while it is still on screen — see the effect below)
      setPending({ href, fromAccount: isAccountPath(window.location.pathname), fromCheckout: isCheckoutPath(window.location.pathname) });
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page / #hash
      begin(url.pathname + url.search);
    };
    const onStart = (e: Event) => begin(String((e as CustomEvent).detail));

    document.addEventListener("click", onClick, true);
    window.addEventListener("nav:start", onStart);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("nav:start", onStart);
    };
  }, []);

  // the skeleton replaces the old page and the view returns to the top in the same frame (before the browser paints),
  // so the top of the old page never flashes by
  useLayoutEffect(() => {
    if (showSkeleton) scrollTopNow();
  }, [showSkeleton]);

  // the skeleton only appears when the next page is slower than a blink; and never stays stuck if a navigation fails
  useEffect(() => {
    if (!pending) {
      setShowSkeleton(false);
      return;
    }
    const show = setTimeout(() => setShowSkeleton(true), SKELETON_DELAY);
    const giveUp = setTimeout(() => setPending(null), 20000);
    return () => {
      clearTimeout(show);
      clearTimeout(giveUp);
    };
  }, [pending]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteDone onDone={() => setPending(null)} />
      </Suspense>
      <div hidden={!!pending && showSkeleton}>{children}</div>
      {pending && showSkeleton && (
        <div aria-busy="true" aria-live="polite">
          {skeletonFor(pending.href, pending.fromAccount, pending.fromCheckout)}
        </div>
      )}
    </>
  );
}
