"use client";

import RequireLogin from "@/components/account/RequireLogin";
import { btnOrange, card, formatBDT, formatDate, Skeleton, StepProgress } from "@/components/account/ui";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import { getOrders } from "@/lib/services/orders.service";
import type { Order } from "@/lib/types";
import { ArrowRight, Clock, Heart, MapPin, Package, RotateCcw, ShoppingBag, Truck, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isFinished, isOffTrack } from "@/lib/api/mappers";

function Thumbs({ order, max = 3 }: { order: Order; max?: number }) {
  const shown = order.items.slice(0, max);
  const more = order.items.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((it, i) => (
        <span key={`${it.productId}-${i}`} className="relative h-11 w-11 shrink-0 overflow-hidden rounded border-2 border-card bg-secondary">
          <Image src={it.imageUrl} alt="" fill sizes="44px" className="object-cover" />
        </span>
      ))}
      {more > 0 && <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded border-2 border-card bg-secondary text-xs font-black text-foreground">+{more}</span>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Package; label: string; value: React.ReactNode; tone: string }) {
  return (
    <div className={`${card} flex items-center gap-3.5 p-4`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-outfit text-2xl font-black leading-none text-foreground">{value}</p>
        <p className="mt-1 truncate text-xs font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Overview() {
  const { user } = useAuth();
  const { vaultCount } = useWishlist();
  const [orders, setOrders] = useState<Order[] | null>(null);

  useEffect(() => {
    let alive = true;
    getOrders()
      .then((o) => alive && setOrders([...o].sort((a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime())))
      .catch(() => alive && setOrders([]));
    return () => {
      alive = false;
    };
  }, []);

  const first = (user?.name ?? "").split(" ")[0] || "there";
  const active = orders?.filter((o) => !isFinished(o.status)) ?? [];
  const spent = orders?.filter((o) => !isOffTrack(o.status)).reduce((s, o) => s + o.total, 0) ?? 0;
  const tracking = active[0];

  return (
    <div className="space-y-6">
      {/* welcome */}
      <div className="relative overflow-hidden rounded bg-linear-to-br from-primary via-[#0b4d9c] to-[#1d6ac9] px-6 py-7 text-white sm:px-8 sm:py-9">
        <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rotate-12 bg-brand-orange/25" aria-hidden="true" />
        <span className="pointer-events-none absolute right-28 top-12 hidden h-4 w-4 bg-brand-orange sm:block" aria-hidden="true" />
        <span className="pointer-events-none absolute bottom-5 right-10 hidden h-6 w-6 rotate-12 bg-sky-300/60 sm:block" aria-hidden="true" />
        <p className="relative text-sm font-semibold text-white/75">Welcome back</p>
        <h1 className="relative mt-1 font-outfit text-3xl font-black tracking-tight sm:text-4xl">
          Hi, {first}! <span className="text-brand-orange">Good to see you.</span>
        </h1>
        <p className="relative mt-2 max-w-md text-sm text-white/80">
          {orders === null
            ? "Loading your account…"
            : active.length > 0
              ? `You have ${active.length} order${active.length > 1 ? "s" : ""} on the way.`
              : "Everything is delivered. Ready for your next outfit?"}
        </p>
        <div className="relative mt-5 flex flex-wrap gap-3">
          <Link href="/products" className={btnOrange}>
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            Keep shopping
          </Link>
          <Link href="/orders" className="inline-flex h-11 items-center gap-2 rounded border border-white/30 px-5 text-sm font-bold text-white transition-colors hover:bg-white/10">
            My orders
          </Link>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {orders === null ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[4.6rem]" />)
        ) : (
          <>
            <Stat icon={Package} label="Total orders" value={orders.length} tone="bg-primary/10 text-primary dark:text-brand-blue" />
            <Stat icon={Truck} label="In progress" value={active.length} tone="bg-brand-orange/15 text-accent-text" />
            <Stat icon={Heart} label="Wishlist" value={vaultCount} tone="bg-rose-500/10 text-rose-600 dark:text-rose-300" />
            <Stat icon={Wallet} label="Total spent" value={formatBDT(spent)} tone="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" />
          </>
        )}
      </div>

      {/* live order tracker */}
      {tracking && (
        <div className={`${card} p-5 sm:p-6`}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold text-accent-text">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Track your latest order
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-foreground">{tracking.orderNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              <Thumbs order={tracking} />
              <StatusBadge status={tracking.status} />
            </div>
          </div>
          <StepProgress order={tracking} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-sm">
            <span className="text-muted-foreground">
              Estimated delivery <b className="text-foreground">{formatDate(tracking.estimatedDelivery)}</b>
            </span>
            <Link href={`/orders/${tracking.id}`} className="inline-flex items-center gap-1.5 font-bold text-accent-text hover:underline">
              Order details <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}

      {/* recent orders */}
      <div className={`${card} p-5 sm:p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-outfit text-lg font-black text-foreground">Recent orders</h2>
          <Link href="/orders" className="inline-flex items-center gap-1 text-sm font-bold text-accent-text hover:underline">
            View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {orders === null ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-18" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">No orders yet. Your first one will show up here.</p>
            <Link href="/products" className="mt-4 text-sm font-bold text-accent-text hover:underline">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {orders.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="group flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <Thumbs order={o} max={2} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-bold text-foreground group-hover:text-accent-text">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(o.placedAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} items
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-sm font-black text-foreground">{formatBDT(o.total)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* shortcuts */}
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:gap-4">
        {[
          { href: "/account/settings#addresses", icon: MapPin, title: "Addresses", text: "Where we deliver" },
          { href: "/wishlist", icon: Heart, title: "Wishlist", text: "Saved for later" },
          { href: "/account/returns", icon: RotateCcw, title: "Returns", text: "Track a return" },
        ].map((t) => (
          <Link key={t.href} href={t.href} className={`${card} group p-4 transition-colors hover:border-brand-orange`}>
            <span className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary transition-colors group-hover:bg-brand-orange group-hover:text-on-orange dark:text-brand-blue">
              <t.icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-bold text-foreground">{t.title}</p>
            <p className="text-xs text-muted-foreground">{t.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <RequireLogin>
      <Overview />
    </RequireLogin>
  );
}
