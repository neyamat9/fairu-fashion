"use client";

import CheckoutHeader from "@/components/checkout/CheckoutHeader";
import { GenericSkeleton } from "@/components/skeletons/PageSkeletons";
import { usePathname } from "next/navigation";

/**
 * Loading placeholders that copy the cart and checkout pages block for block (same container, same heading,
 * same step line, same form / summary columns), so the real page replaces them without anything jumping.
 */

const bar = "animate-pulse rounded bg-secondary";
const B = ({ className = "", style }: { className?: string; style?: React.CSSProperties }) => <div className={`${bar} ${className}`} style={style} />;
const panel = "rounded bg-muted border border-border";

function Heading() {
  return (
    <div className="mb-8">
      <B className="h-9 w-44 md:h-10" />
      <div className="mt-2 h-1 w-16 rounded bg-brand-orange/40" />
    </div>
  );
}

/** 1 → 2 → 3 step line, like StepIndicator */
function Steps() {
  return (
    <div className="mb-8 flex items-center justify-center md:mb-10" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-2">
            <B className="h-10 w-10" />
            <B className="h-4 w-16" />
          </div>
          {i < 2 && <div className="mx-3 mb-6 h-0.5 w-12 rounded bg-secondary sm:w-24 md:w-36" />}
        </div>
      ))}
    </div>
  );
}

function Field({ label = "w-24" }: { label?: string }) {
  return (
    <div>
      <B className={`mb-1.5 h-3.5 ${label}`} />
      <B className="h-[46px] w-full" />
    </div>
  );
}

/** The order summary column (items, coupon box, totals) */
function SummaryColumn() {
  return (
    <aside className="overflow-hidden rounded border border-border bg-muted" aria-hidden="true">
      <div className="border-b border-border px-5 py-4">
        <B className="h-4 w-32" />
      </div>
      <div className="divide-y divide-border">
        {[0].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3">
            <B className="h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <B className="h-3.5 w-3/4" />
              <B className="h-3 w-1/3" />
            </div>
            <B className="h-4 w-14" />
          </div>
        ))}
      </div>
      <div className="space-y-3 border-t border-border px-5 py-4">
        <div className="flex gap-2">
          <B className="h-10 flex-1" />
          <B className="h-10 w-20" />
        </div>
        <div className="flex justify-between"><B className="h-4 w-16" /><B className="h-4 w-14" /></div>
        <div className="flex justify-between"><B className="h-4 w-28" /><B className="h-4 w-12" /></div>
        <div className="flex justify-between border-t border-border pt-3"><B className="h-5 w-12" /><B className="h-6 w-20" /></div>
        <B className="h-3.5 w-36" />
        <B className="h-3 w-24" />
      </div>
    </aside>
  );
}

/** The checkout page's own content (what sits under the header). */
export function CheckoutBodySkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12" aria-busy="true" aria-label="Loading checkout">
      <Heading />
      <Steps />
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]">
        <div className={`${panel} p-6 md:p-8`}>
          <div className="mb-6 space-y-2">
            <B className="h-6 w-48" />
            <B className="h-4 w-64 max-w-full" />
          </div>
          <div className="space-y-5">
            <B className="h-3.5 w-72 max-w-full" />
            <B className="h-[54px] w-full max-w-xs" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="w-24" />
              <Field label="w-32" />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="w-16" />
              <Field label="w-16" />
              <Field label="w-24" />
            </div>
            <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
              <Field label="w-20" />
              <Field label="w-24" />
            </div>
            <B className="h-14 w-full" />
          </div>
        </div>
        <SummaryColumn />
      </div>
    </div>
  );
}

/** The cart's two columns (item list + summary). The cart page draws its own heading, so it uses just this. */
export function CartListSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_380px]" aria-busy="true" aria-label="Loading your cart">
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${panel} flex gap-4 p-4`}>
            <B className="h-24 w-24 shrink-0" />
            <div className="flex-1 space-y-3">
              <B className="h-4 w-3/4" />
              <B className="h-3.5 w-1/3" />
              <B className="h-9 w-28" />
            </div>
            <B className="hidden h-5 w-16 sm:block" />
          </div>
        ))}
      </div>
      <div className={`${panel} space-y-4 p-6`}>
        <B className="h-5 w-36" />
        <B className="h-4 w-full" />
        <B className="h-4 w-full" />
        <div className="border-t border-border pt-4"><B className="h-7 w-full" /></div>
        <B className="h-14 w-full" />
      </div>
    </div>
  );
}

/** The whole cart page body (heading + columns), for the loading screens. */
export function CartBodySkeleton() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8 md:py-12">
      <Heading />
      <CartListSkeleton />
    </div>
  );
}

/** The route's `loading.tsx`: picks the cart or the checkout shape (the header comes from the layout). */
export function CheckoutRouteSkeleton() {
  const path = usePathname();
  if (path === "/checkout") return <CheckoutBodySkeleton />;
  if (path === "/cart") return <CartBodySkeleton />;
  return <GenericSkeleton />;
}

/**
 * Shown the instant a link to /cart or /checkout is clicked from the storefront: a full-screen layer with the
 * checkout header on top and the page shape under it — the same screen the checkout will be — so the storefront's
 * navbar never flashes through.
 */
export function CheckoutOverlaySkeleton({ path }: { path: string }) {
  return (
    <div className="fixed inset-0 z-[1200] overflow-y-auto bg-background" data-lenis-prevent aria-busy="true">
      <CheckoutHeader />
      {path === "/cart" ? <CartBodySkeleton /> : <CheckoutBodySkeleton />}
    </div>
  );
}
