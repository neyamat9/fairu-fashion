import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { orderStatusLabel, titleCase } from "@/lib/format";
import { ORDER_STATUSES } from "@/api/orders";

const MAP: Record<string, BadgeVariant> = {
  // orders
  PENDING: "warning", CONFIRMED: "info", PROCESSING: "info", SHIPPED: "brand", IN_TRANSIT: "brand",
  OUT_FOR_DELIVERY: "brand", DELIVERED: "success", CANCELLED: "danger", RETURNED: "neutral", REFUNDED: "neutral", ON_HOLD: "warning",
  // payments
  PAID: "success", FAILED: "danger", PARTIALLY_REFUNDED: "warning",
  // products / generic
  ACTIVE: "success", INACTIVE: "neutral", DRAFT: "warning", DISCONTINUED: "danger", OUT_OF_STOCK: "danger",
  // customers
  SUSPENDED: "warning", BANNED: "danger",
  // returns
  REQUESTED: "warning", APPROVED: "info", PICKED_UP: "brand", RECEIVED: "brand", REJECTED: "danger", REPLACED: "success",
  // reviews
  FLAGGED: "danger",
  // tickets
  OPEN: "warning", IN_PROGRESS: "info", WAITING_CUSTOMER: "orange", RESOLVED: "success", CLOSED: "neutral",
  // contact
  NEW: "warning", READ: "neutral", REPLIED: "success",
  // coupon states
  active: "success", scheduled: "info", expired: "neutral", inactive: "neutral", "used-up": "warning",
  // stock
  in: "success", low: "warning", out: "danger",
  // methods
  CASH_ON_DELIVERY: "neutral", BKASH: "orange", NAGAD: "orange", ROCKET: "orange",
};

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  if (!status) return <Badge>—</Badge>;
  const text = label ?? (status === "in" ? "In stock" : status === "low" ? "Low stock" : status === "out" ? "Out of stock" : status === "CASH_ON_DELIVERY" ? "Cash on delivery" : status === "BKASH" ? "bKash" : status === "NAGAD" ? "Nagad" : status === "ROCKET" ? "Rocket" : (ORDER_STATUSES as readonly string[]).includes(status) ? orderStatusLabel(status) : titleCase(status));
  return <Badge variant={MAP[status] ?? "neutral"} dot>{text}</Badge>;
}
