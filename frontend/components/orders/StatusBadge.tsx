import type { OrderStatus } from "@/lib/types";

// ── Status colour map (readable on the cream light theme and on the navy dark theme) ──
// The eleven statuses are the same words the admin dashboard shows. Pending/On hold → amber · Confirmed → blue · Processing → sky
// Shipped → violet · In transit → indigo · Out for delivery → fuchsia · Delivered → green · Cancelled → red · Returned → orange · Refunded → slate

export const STATUS_STYLES: Record<OrderStatus, { text: string; bg: string; border: string; dot: string }> = {
  "Pending": {
    text: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    dot: "bg-amber-500",
  },
  "Confirmed": {
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-500",
  },
  "Processing": {
    text: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    dot: "bg-sky-500",
  },
  "Shipped": {
    text: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    dot: "bg-violet-500",
  },
  "In transit": {
    text: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    dot: "bg-indigo-500",
  },
  "Out for delivery": {
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    dot: "bg-fuchsia-500",
  },
  "Delivered": {
    text: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  "Cancelled": {
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    dot: "bg-red-500",
  },
  "Returned": {
    text: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    dot: "bg-orange-500",
  },
  "Refunded": {
    text: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    dot: "bg-slate-500",
  },
  "On hold": {
    text: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    dot: "bg-yellow-500",
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
  /** Optional extra Tailwind classes */
  className?: string;
}

/** Colour-coded pill for an order status. */
export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-[11px] font-bold ${s.text} ${s.bg} ${s.border} ${className}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}
