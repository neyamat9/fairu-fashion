"use client";

import { errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { claimOrders, trackOrder, type TrackedOrder } from "@/lib/services/orders.service";
import { statusLabel } from "@/lib/api/mappers";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const fmt = (n: string | number) => `৳${Number(n).toLocaleString("en-BD")}`;
const input = "w-full rounded border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-brand-orange";

function Tracker() {
  const params = useSearchParams();
  const { user } = useAuth();
  const [number, setNumber] = useState(params.get("n") ?? "");
  const [phone, setPhone] = useState(params.get("p") ?? "");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(n = number, p = phone) {
    setBusy(true);
    setError(null);
    setOrder(null);
    try {
      setOrder(await trackOrder(n.trim(), p.trim()));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const n = params.get("n");
    const p = params.get("p");
    if (n && p) void lookup(n, p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function claim() {
    try {
      const r = await claimOrders([{ orderNumber: number.trim(), phone: phone.trim() }]);
      toast.success(r.claimed ? "Order added to your account" : "This order is already in an account");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-accent-text">Orders</p>
        <h1 className="font-outfit text-4xl font-black tracking-tight text-foreground">Track your <span className="text-accent-text">order</span></h1>
        <p className="mt-2 text-sm text-muted-foreground/70">No account needed. Enter the order number from your confirmation and the phone number you ordered with.</p>

        <form onSubmit={(e) => { e.preventDefault(); void lookup(); }} className="mt-8 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label htmlFor="n" className="sr-only">Order number</label>
            <input id="n" required value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Order number, e.g. GB-20260101-0001" className={input} />
          </div>
          <div>
            <label htmlFor="p" className="sr-only">Phone</label>
            <input id="p" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone, e.g. 01712345678" className={input} />
          </div>
          <button type="submit" disabled={busy} className="rounded bg-brand-orange px-6 py-3 text-xs font-black uppercase tracking-widest text-foreground hover:bg-brand-orange/90 disabled:opacity-60">{busy ? "Looking…" : "Track"}</button>
        </form>

        {error && <p role="alert" className="mt-6 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        {order && (
          <div className="mt-8 space-y-5 rounded border border-border bg-muted p-6 text-foreground">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-accent-text">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground/70">Placed {new Date(order.placedAt).toLocaleString("en-BD")}</p>
              </div>
              <span className="rounded bg-secondary px-4 py-1.5 text-xs font-black uppercase tracking-wider">{statusLabel(order.status)}</span>
            </div>

            <ol className="space-y-3 border-l border-border pl-5">
              {order.timeline.map((t, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -left-[25px] top-1.5 size-2.5 rounded bg-brand-orange" />
                  <b>{t.status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</b>
                  {t.note && <span className="text-muted-foreground"> — {t.note}</span>}
                  <p className="text-xs text-muted-foreground/70">{new Date(t.at).toLocaleString("en-BD")}</p>
                </li>
              ))}
            </ol>

            {(order.courierName || order.trackingNumber) && (
              <p className="text-sm text-foreground/80">
                Courier: <b>{order.courierName ?? "—"}</b> {order.trackingNumber && <>· Tracking <span className="font-mono">{order.trackingNumber}</span></>}{" "}
                {order.trackingUrl && <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-accent-text underline">Open</a>}
              </p>
            )}

            <ul className="divide-y divide-border text-sm">
              {order.items.map((i, k) => (
                <li key={k} className="flex justify-between py-2"><span>{i.productName}{i.variantName ? ` (${i.variantName})` : ""} × {i.quantity}</span><span>{fmt(i.total)}</span></li>
              ))}
            </ul>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd>{fmt(order.subtotal)}</dd></div>
              {Number(order.discountAmount) > 0 && <div className="flex justify-between text-emerald-300"><dt>Discount</dt><dd>− {fmt(order.discountAmount)}</dd></div>}
              <div className="flex justify-between text-muted-foreground"><dt>Shipping</dt><dd>{fmt(order.shippingCost)}</dd></div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd className="text-accent-text">{fmt(order.total)}</dd></div>
              {Number(order.dueAmount) > 0 && <div className="flex justify-between text-foreground/80"><dt>To pay</dt><dd>{fmt(order.dueAmount)}</dd></div>}
            </dl>
            {order.deliverTo && <p className="text-xs text-muted-foreground/70">Delivering to {order.deliverTo.name}{order.deliverTo.city ? `, ${order.deliverTo.city}` : ""}</p>}
            {user && <button type="button" onClick={claim} className="rounded border border-border px-4 py-2 text-xs font-black uppercase tracking-widest text-foreground/80 hover:text-foreground">Add this order to my account</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
