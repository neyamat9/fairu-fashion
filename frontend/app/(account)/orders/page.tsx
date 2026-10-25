"use client";

import RequireLogin from "@/components/account/RequireLogin";
import { btnPrimary, card, EmptyState, formatBDT, formatDate, PageHeading, Skeleton, StepProgress } from "@/components/account/ui";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { errorMessage } from "@/lib/api/client";
import { useCart } from "@/lib/hooks/use-cart";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search";
import { getOrders, reorder } from "@/lib/services/orders.service";
import type { Order } from "@/lib/types";
import { AlertTriangle, ArrowRight, Package, RefreshCw, RotateCw, Search, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { isFinished, isOffTrack } from "@/lib/api/mappers";

type Filter = "all" | "active" | "delivered" | "cancelled";
const FILTERS: { id: Filter; label: string; test: (o: Order) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "active", label: "In progress", test: (o) => !isFinished(o.status) },
  { id: "delivered", label: "Delivered", test: (o) => o.status === "Delivered" },
  { id: "cancelled", label: "Cancelled / returned", test: (o) => isOffTrack(o.status) },
];

function OrderRow({ order }: { order: Order }) {
  const { refreshCart, openCart } = useCart();
  const [busy, setBusy] = useState(false);
  const count = order.items.reduce((s, i) => s + i.quantity, 0);
  const names = order.items.map((i) => i.name);
  const summary = names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2} more` : "");

  async function buyAgain() {
    setBusy(true);
    try {
      await reorder(order.id);
      await refreshCart();
      toast.success("Items added to your cart");
      openCart();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className={`${card} group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand-orange/60 hover:shadow-md`}>
      {/* the whole card is one big link to the order; the buttons below sit above it */}
      <Link href={`/orders/${order.id}`} aria-label={`Open order ${order.orderNumber}`} className="absolute inset-0 z-0" />
      <div className="pointer-events-none relative flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/50 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-bold text-foreground">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">Placed {formatDate(order.placedAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="pointer-events-none relative grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {order.items.slice(0, 3).map((it, i) => (
              <span key={`${it.productId}-${i}`} className="relative h-14 w-14 shrink-0 overflow-hidden rounded border-2 border-card bg-secondary">
                <Image src={it.imageUrl} alt="" fill sizes="56px" className="object-cover" />
              </span>
            ))}
            {order.items.length > 3 && <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded border-2 border-card bg-secondary text-sm font-black">+{order.items.length - 3}</span>}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-semibold text-foreground">{summary}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {count} {count === 1 ? "item" : "items"} · <b className="text-foreground">{formatBDT(order.total)}</b>
            </p>
          </div>
        </div>
        <div className="hidden md:block">
          <StepProgress order={order} />
        </div>
      </div>

      <div className="pointer-events-none relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
        <p className="text-xs text-muted-foreground">
          {order.status === "Delivered" ? "Delivered" : isOffTrack(order.status) ? order.status : <>Estimated delivery <b className="text-foreground">{formatDate(order.estimatedDelivery)}</b></>}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={buyAgain} disabled={busy} className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded border border-border px-3 text-xs font-bold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text disabled:opacity-60">
            <RotateCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden="true" />
            Buy again
          </button>
          <Link href={`/orders/${order.id}`} className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded bg-primary px-3.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90">
            Details <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const { input, setInput, query, clear } = useDebouncedSearch(250);

  const load = useCallback(() => {
    setError(false);
    getOrders()
      .then((o) => setOrders([...o].sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())))
      .catch(() => setError(true));
  }, []);
  useEffect(load, [load]);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, orders?.filter(f.test).length ?? 0])) as Record<Filter, number>, [orders]);
  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter)!.test;
    const q = query.toLowerCase();
    return (orders ?? []).filter((o) => test(o) && (!q || o.orderNumber.toLowerCase().includes(q) || o.items.some((i) => i.name.toLowerCase().includes(q))));
  }, [orders, filter, query]);

  return (
    <>
      <PageHeading title="My" accent="orders" subtitle={orders === null ? "Loading your orders…" : `${orders.length} ${orders.length === 1 ? "order" : "orders"} so far`} />

      {error ? (
        <div className={`${card} flex flex-col items-center px-6 py-14 text-center`}>
          <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden="true" />
          <h2 className="mt-4 font-outfit text-xl font-black text-foreground">We couldn&apos;t load your orders</h2>
          <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
          <button type="button" onClick={load} className={`${btnPrimary} mt-5`}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : orders === null ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={Package} title="No orders yet" text="Your order history will appear here after your first purchase." action={{ href: "/products", label: "Start shopping" }} />
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`inline-flex shrink-0 items-center gap-2 rounded border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-brand-orange"
                  }`}
                >
                  {f.label}
                  <span className={`rounded px-1.5 text-[11px] font-black ${filter === f.id ? "bg-white/20" : "bg-secondary"}`}>{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                type="search"
                placeholder="Order number or product…"
                aria-label="Search your orders"
                className="h-11 w-full rounded border-2 border-input bg-background pl-10 pr-9 text-sm outline-none transition-all placeholder:text-muted-foreground/80 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/20"
              />
              {input && (
                <button type="button" onClick={clear} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {shown.length === 0 ? (
            <div className={`${card} px-6 py-14 text-center`}>
              <Search className="mx-auto h-9 w-9 text-muted-foreground/60" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">No orders match{query ? ` “${query}”` : " this filter"}.</p>
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  clear();
                }}
                className="mt-3 text-sm font-bold text-accent-text hover:underline"
              >
                Show all orders
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {shown.map((o) => (
                <OrderRow key={o.id} order={o} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function OrdersPage() {
  return (
    <RequireLogin>
      <Orders />
    </RequireLogin>
  );
}
