import { Check, CircleSlash, Route, PackageCheck, PackagePlus, Settings2, Truck, ShieldCheck, Undo2, type LucideIcon } from "lucide-react";
import type { OrderDetail, OrderStatus } from "@/api/orders";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string; icon: LucideIcon }[] = [
  { status: "PENDING", label: "Placed", icon: PackagePlus },
  { status: "CONFIRMED", label: "Confirmed", icon: ShieldCheck },
  { status: "PROCESSING", label: "Processing", icon: Settings2 },
  { status: "SHIPPED", label: "Shipped", icon: Truck },
  { status: "IN_TRANSIT", label: "In transit", icon: Route },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery", icon: Truck },
  { status: "DELIVERED", label: "Delivered", icon: PackageCheck },
];
const ORDER = STEPS.map((s) => s.status);

/** Where the order is on its way: a step tracker, horizontal on tablets and up, vertical on phones. */
export function OrderProgress({ order }: { order: OrderDetail }) {
  const when = (s: OrderStatus) => order.statusHistory.find((h) => h.toStatus === s)?.createdAt ?? (s === "PENDING" ? order.placedAt : undefined);
  const side = ["CANCELLED", "RETURNED", "REFUNDED"].includes(order.status);
  // ON_HOLD stays where it was
  const cur = order.status === "ON_HOLD" ? Math.max(0, ...order.statusHistory.map((h) => ORDER.indexOf(h.toStatus))) : ORDER.indexOf(order.status);

  if (side) {
    const Icon = order.status === "CANCELLED" ? CircleSlash : Undo2;
    return (
      <div className="mb-4 flex items-center gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
        <Icon className="size-5 shrink-0" />
        <div className="text-[13px]">
          <p className="font-semibold">This order was {order.status.toLowerCase()}</p>
          <p className="text-xs opacity-80">{dateTime(when(order.status) ?? order.placedAt)}</p>
        </div>
      </div>
    );
  }

  return (
    <ol className="mb-4 grid gap-y-1 rounded border border-border bg-card p-4 sm:grid-cols-7" aria-label="Order progress">
      {STEPS.map((s, i) => {
        const done = i < cur || order.status === "DELIVERED";
        const active = i === cur && order.status !== "DELIVERED";
        const at = when(s.status);
        const Icon = done ? Check : s.icon;
        return (
          <li key={s.status} className="relative flex gap-3 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center">
            {/* connector to the next step */}
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 sm:left-1/2 sm:top-[15px] sm:h-0.5 sm:w-full",
                  i < cur || order.status === "DELIVERED" ? "bg-success" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded border-2 transition-colors",
                done && "border-success bg-success text-white",
                active && "border-brand bg-brand text-brand-foreground shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_25%,transparent)]",
                !done && !active && "border-border bg-card text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 pb-3 sm:pb-0">
              <span className={cn("block text-[13px] font-semibold", !done && !active && "text-muted-foreground")}>{s.label}</span>
              <span className="block text-[11px] text-muted-foreground">{at ? dateTime(at) : active ? "In progress" : "—"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
