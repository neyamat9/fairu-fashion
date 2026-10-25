"use client";

import { usePathname } from "next/navigation";

/**
 * Loading placeholders that copy the account pages one to one: the same frame (menu column + content column),
 * and for each page the same blocks in the same order and size. Used
 *  - by NavigationGate the instant a link to an account page is clicked (full frame when coming from outside the account),
 *  - by the account layout's loading.tsx (content only, the real menu is already on screen).
 */

const bar = "animate-pulse rounded bg-secondary";
const B = ({ className = "" }: { className?: string }) => <div className={`${bar} ${className}`} />;
const card = "rounded border border-border bg-card";

export const isAccountPath = (p: string) => p === "/account" || p.startsWith("/account/") || p === "/orders" || p.startsWith("/orders/") || p === "/wishlist";

/** Same frame as AccountShell: profile card + menu on the left (desktop) or a tab bar on top (phones). */
function Sidebar() {
  return (
    <aside className="hidden lg:block" aria-hidden="true">
      <div className={`${card} overflow-hidden`}>
        <div className="h-[6.1rem] animate-pulse bg-secondary" />
        <div className="relative -mt-9 px-5 pb-5">
          <div className="h-18 w-18 animate-pulse rounded border-4 border-card bg-muted" />
          <B className="mt-3 h-5 w-36" />
          <B className="mt-2 h-3 w-28" />
        </div>
        <div className="space-y-1 border-t border-border p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <B key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </aside>
  );
}

function Tabs() {
  return (
    <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-hidden px-4 py-2 sm:-mx-6 sm:px-6 lg:hidden" aria-hidden="true">
      {[104, 112, 104, 96, 150].map((w, i) => (
        <div key={i} className={`${bar} h-10 shrink-0`} style={{ width: w }} />
      ))}
    </div>
  );
}

function Heading({ wide = false }: { wide?: boolean }) {
  return (
    <div className="mb-6">
      <B className={`h-[2.8rem] ${wide ? "w-72" : "w-56"} max-w-full`} />
      <B className="mt-2.5 h-4 w-64 max-w-full" />
    </div>
  );
}

function Overview() {
  return (
    <div className="space-y-6">
      <B className="h-[14.25rem] w-full" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <B key={i} className="h-[4.9rem]" />
        ))}
      </div>
      <B className="h-[13.8rem] w-full" />
      <div className={`${card} p-5 sm:p-6`}>
        <B className="mb-4 h-6 w-40" />
        <div className="space-y-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <B key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <B key={i} className="h-[7.6rem]" />
        ))}
      </div>
    </div>
  );
}

function Orders() {
  return (
    <>
      <Heading />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-hidden">
          {[64, 120, 112, 118].map((w, i) => (
            <div key={i} className={`${bar} h-10 shrink-0`} style={{ width: w }} />
          ))}
        </div>
        <B className="h-11 lg:w-72" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <B key={i} className="h-[13.75rem] w-full" />
        ))}
      </div>
    </>
  );
}

function OrderDetail() {
  return (
    <div className="space-y-5">
      <B className="h-5 w-24" />
      <B className="h-[19.9rem] w-full" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <B className="h-[34rem] w-full" />
        <div className="space-y-5">
          <B className="h-44 w-full" />
          <B className="h-28 w-full" />
          <B className="h-[11.7rem] w-full" />
        </div>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <>
      <Heading />
      <div className="space-y-6">
        <B className="h-[21.6rem] w-full" />
        <B className="h-[18.75rem] w-full" />
        <B className="h-[21.6rem] w-full" />
      </div>
    </>
  );
}

function Wishlist() {
  return (
    <>
      <Heading />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${card} overflow-hidden`}>
            <div className={`${bar} aspect-square w-full rounded-none`} />
            <div className="space-y-2.5 p-3.5 sm:p-4">
              <B className="h-4 w-full" />
              <B className="h-4 w-2/3" />
              <B className="h-6 w-24" />
              <B className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Returns() {
  return (
    <>
      <Heading />
      <div className="space-y-4">
        <B className="h-36 w-full" />
        <B className="h-36 w-full" />
      </div>
    </>
  );
}

function Generic() {
  return (
    <>
      <Heading />
      <B className="h-40 w-full" />
      <B className="mt-5 h-40 w-full" />
    </>
  );
}

function bodyFor(path: string) {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (p === "/account") return <Overview />;
  if (p === "/orders") return <Orders />;
  if (p.startsWith("/orders/")) return <OrderDetail />;
  if (p === "/account/settings") return <Settings />;
  if (p === "/wishlist") return <Wishlist />;
  if (p === "/account/returns" || p.startsWith("/account/returns/")) return <Returns />;
  return <Generic />;
}

/** Only the page's own content (the account menu is already on screen). */
export function AccountContentSkeleton({ path }: { path?: string }) {
  const current = usePathname();
  return (
    <div aria-busy="true" aria-label="Loading">
      {bodyFor(path ?? current)}
    </div>
  );
}

/** The whole account page: frame + menu + content. `withMenu` is false for a signed-out visitor (no menu is shown to them). */
export function AccountPageSkeleton({ path, withMenu = true }: { path: string; withMenu?: boolean }) {
  return (
    <section className="min-h-screen bg-background" aria-busy="true" aria-label="Loading">
      {withMenu ? (
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-10">
          <Tabs />
          <Sidebar />
          <div className="min-w-0">{bodyFor(path)}</div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{bodyFor(path)}</div>
      )}
    </section>
  );
}
