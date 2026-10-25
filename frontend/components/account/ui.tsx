"use client";

import type { Order } from "@/lib/types";
import { BadgeCheck, ClipboardList, PackageOpen, PartyPopper, Truck, XCircle, type LucideIcon, PauseCircle } from "lucide-react";
import Link from "next/link";

// Small building blocks shared by the account pages.

export const card = "rounded border border-border bg-card";
export const inputBase =
  "h-11 w-full rounded border-2 border-input bg-background px-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:font-normal placeholder:text-muted-foreground/80 hover:border-primary/40 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/20 disabled:opacity-60";
export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded bg-linear-to-r from-primary to-[#1d6ac9] px-5 text-sm font-bold text-white shadow-[0_10px_24px_-12px_rgba(5,57,114,0.8)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-12px_rgba(249,155,16,0.6)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
export const btnOrange =
  "inline-flex h-11 items-center justify-center gap-2 rounded bg-brand-orange px-5 text-sm font-bold text-on-orange transition-colors hover:bg-brand-orange/90 disabled:cursor-not-allowed disabled:opacity-60";
export const btnGhost =
  "inline-flex h-11 items-center justify-center gap-2 rounded border border-border bg-card px-5 text-sm font-bold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text disabled:cursor-not-allowed disabled:opacity-60";

export const formatBDT = (n: number) => `৳${n.toLocaleString("en-BD")}`;
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-secondary ${className}`} />;
}

/** Page title block: big title, one-line description and optional actions on the right. */
export function PageHeading({ title, accent, subtitle, actions }: { title: string; accent?: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-outfit text-3xl font-black leading-tight tracking-tight text-primary dark:text-foreground sm:text-4xl">
          {title} {accent && <span className="text-brand-orange">{accent}</span>}
        </h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: { href: string; label: string } }) {
  return (
    <div className={`${card} flex flex-col items-center px-6 py-16 text-center`}>
      <span className="flex h-16 w-16 items-center justify-center rounded bg-primary/10 text-primary dark:text-brand-blue">
        <Icon className="h-8 w-8" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-outfit text-xl font-black text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{text}</p>
      {action && (
        <Link href={action.href} className={`${btnPrimary} mt-6`}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

/** The five stages of an order. `raw` is the server's own status, so Confirmed and Packing are told apart. */
export const ORDER_STEPS = [
  { key: "placed", label: "Placed", icon: ClipboardList },
  { key: "confirmed", label: "Confirmed", icon: BadgeCheck },
  { key: "packing", label: "Packing", icon: PackageOpen },
  { key: "shipped", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PartyPopper },
] as const;

type StepOrder = Pick<Order, "status" | "rawStatus" | "statusHistory" | "placedAt" | "confirmedAt" | "processingAt" | "shippedAt" | "deliveredAt">;

export function stepIndex(o: Pick<Order, "status" | "rawStatus">): number {
  switch (o.rawStatus) {
    case "CONFIRMED": return 1;
    case "PROCESSING": return 2;
    case "SHIPPED": case "IN_TRANSIT": case "OUT_FOR_DELIVERY": return 3;
    case "DELIVERED": return 4;
    case "PENDING": case "ON_HOLD": return 0;
  }
  return o.status === "Delivered" ? 4 : o.status === "Shipped" || o.status === "In transit" || o.status === "Out for delivery" ? 3 : o.status === "Processing" ? 2 : o.status === "Confirmed" ? 1 : 0;
}

/**
 * Order progress as five round steps joined by a line (Placed → Confirmed → Packing → On the way → Delivered).
 * Finished steps are filled orange with their icon, the current one pulses, the rest wait greyed out.
 * A cancelled order shows one red note instead.
 */
export function StepProgress({ order, timestamps = false }: { order: StepOrder; timestamps?: boolean }) {
  if (order.status === "Cancelled" || order.status === "Returned" || order.status === "Refunded") {
    return (
      <p className="flex items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300">
        <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {order.status === "Cancelled" ? "This order was cancelled." : order.status === "Returned" ? "This order was returned." : "This order was refunded."}
      </p>
    );
  }
  const onHold = order.status === "On hold";
  const active = stepIndex(order);
  const at = [order.placedAt, order.confirmedAt, order.processingAt, order.shippedAt, order.deliveredAt];
  return (
    <>
    {onHold && (
      <p className="mb-3 flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
        <PauseCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        On hold: we will contact you about this order.
      </p>
    )}
    <ol className="flex w-full items-start" aria-label="Order progress">
      {ORDER_STEPS.map((s, i) => {
        const done = i < active || (i === active && active === 4);
        const current = i === active && !done;
        const Icon = s.icon;
        return (
          <li key={s.key} className="relative flex flex-1 flex-col items-center text-center" aria-current={current ? "step" : undefined}>
            {i > 0 && <span className={`absolute right-1/2 top-[17px] h-1 w-full rounded transition-colors ${i <= active ? "bg-brand-orange" : "bg-secondary"}`} aria-hidden="true" />}
            <span
              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                done ? "border-brand-orange bg-brand-orange text-on-orange" : current ? "border-brand-orange bg-card text-accent-text ring-4 ring-brand-orange/25" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {current && <span className="absolute inset-0 animate-ping rounded-full bg-brand-orange/20" aria-hidden="true" />}
              <Icon className="relative h-4 w-4" aria-hidden="true" />
            </span>
            <span className={`mt-1.5 text-[11px] font-semibold leading-tight sm:text-xs ${done || current ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            {/* the exact stage, in the admin's own words, under the step it belongs to */}
            {current && i === 3 && <span className="mt-0.5 text-[10px] font-medium text-accent-text">{order.status}</span>}
            {timestamps && (done || current) && at[i] && <span className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">{formatDateTime(at[i]!)}</span>}
          </li>
        );
      })}
    </ol>
    </>
  );
}
