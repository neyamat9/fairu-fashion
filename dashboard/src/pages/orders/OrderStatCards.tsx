import { useQuery } from "@tanstack/react-query";
import { Ban, Banknote, CheckCircle2, Clock, Package, ShoppingBag, Truck, Wallet } from "lucide-react";
import { ordersApi, type OrderFilters } from "@/api/orders";
import { StatCard } from "@/components/shared/StatCard";
import { money } from "@/lib/format";

export interface OrderCardFilter {
  stage: string;
  toVerify: string;
}

const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}% of all orders` : "—");

/**
 * The cards above the orders list. Numbers follow the page's search, date, source and payment filters (not the status);
 * clicking a card filters the list to it, clicking it again clears it.
 */
export function OrderStatCards({ filters, stage, toVerify, onPick }: { filters: OrderFilters; stage: string; toVerify: string; onPick: (f: OrderCardFilter) => void }) {
  const { page: _p, limit: _l, sortBy: _s, status: _st, stage: _sg, toVerify: _tv, ...base } = filters;
  void [_p, _l, _s, _st, _sg, _tv];
  const q = useQuery({ queryKey: ["orders", "stats", base], queryFn: () => ordersApi.stats(base), placeholderData: (p) => p });
  const s = q.data;
  const loading = q.isLoading;
  const none: OrderCardFilter = { stage: "", toVerify: "" };
  const toggle = (next: OrderCardFilter, on: boolean) => () => onPick(on ? none : next);
  const isAll = !stage && !toVerify && !filters.status;

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard hintSk label="Total orders" value={s?.total.toLocaleString() ?? ""} hint={s ? `${s.today} today` : undefined} icon={<ShoppingBag size={18} />} loading={loading} active={isAll} onClick={() => onPick(none)} />
      <StatCard hintSk label="To confirm" tone="orange" value={s?.pending.toLocaleString() ?? ""} hint={s ? (s.onHold ? `+${s.onHold} on hold` : "waiting for you") : undefined} icon={<Clock size={18} />} loading={loading} active={stage === "pending"} onClick={toggle({ stage: "pending", toVerify: "" }, stage === "pending")} />
      <StatCard hintSk label="To ship" tone="sky" value={s?.toShip.toLocaleString() ?? ""} hint={s ? "confirmed + processing" : undefined} icon={<Package size={18} />} loading={loading} active={stage === "toShip"} onClick={toggle({ stage: "toShip", toVerify: "" }, stage === "toShip")} />
      <StatCard hintSk label="In delivery" value={s?.inDelivery.toLocaleString() ?? ""} hint={s ? "shipped, on the way" : undefined} icon={<Truck size={18} />} loading={loading} active={stage === "inDelivery"} onClick={toggle({ stage: "inDelivery", toVerify: "" }, stage === "inDelivery")} />
      <StatCard hintSk label="Delivered" tone="green" value={s?.delivered.toLocaleString() ?? ""} hint={s ? pct(s.delivered, s.total) : undefined} icon={<CheckCircle2 size={18} />} loading={loading} active={stage === "delivered"} onClick={toggle({ stage: "delivered", toVerify: "" }, stage === "delivered")} />
      <StatCard hintSk label="Payment to verify" tone="orange" value={s?.paymentToVerify.toLocaleString() ?? ""} hint={s ? "bKash · Nagad · Rocket" : undefined} icon={<Wallet size={18} />} loading={loading} active={toVerify === "true"} onClick={toggle({ stage: "", toVerify: "true" }, toVerify === "true")} />
      <StatCard hintSk label="Revenue" tone="orange" value={s ? money(s.revenue) : ""} hint={s ? `${money(s.revenueToday)} today` : undefined} icon={<Banknote size={18} />} loading={loading} />
      <StatCard hintSk label="Cancelled / returned" tone="red" value={s?.ended.toLocaleString() ?? ""} hint={s ? pct(s.ended, s.total) : undefined} icon={<Ban size={18} />} loading={loading} active={stage === "ended"} onClick={toggle({ stage: "ended", toVerify: "" }, stage === "ended")} />
    </div>
  );
}
