"use client";

import { errorMessage } from "@/lib/api/client";
import type { CheckoutSummary } from "@/lib/services/checkout.service";
import Image from "next/image";
import { useState } from "react";

interface Props {
  summary: CheckoutSummary | null;
  loading: boolean;
  /** coupon code currently applied (or typed) */
  couponCode: string;
  onApplyCoupon: (code: string) => Promise<void>;
  onRemoveCoupon: () => void;
}

const fmt = (n: number) => new Intl.NumberFormat("en-BD").format(n);

/** Right column: items, coupon, shipping and the total — all worked out by the server. */
export default function OrderSummaryPanel({ summary, loading, couponCode, onApplyCoupon, onRemoveCoupon }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await onApplyCoupon(code.trim().toUpperCase());
      setCode("");
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="rounded bg-muted border border-border overflow-hidden" aria-busy={loading}>
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-sm font-black uppercase tracking-widest text-foreground/80">Order summary</h2>
      </div>

      <div className="divide-y divide-border max-h-[320px] overflow-y-auto">
        {(summary?.items ?? []).map((i) => (
          <div key={i.cartItemId} className="flex items-center gap-3 px-5 py-3">
            <div className="relative w-12 h-12 rounded overflow-hidden bg-secondary shrink-0">
              <Image src={i.image ?? "/placeholder.svg"} alt={i.name} fill sizes="48px" className="object-cover" unoptimized />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground line-clamp-1">{i.name}</p>
              {i.variantName && <p className="text-xs text-muted-foreground/70">{i.variantName}</p>}
              <p className="text-xs text-muted-foreground">৳{fmt(i.unitPrice)} × {i.quantity}</p>
              {i.issue && <p className="text-xs text-red-400">{i.issue}</p>}
            </div>
            <span className="text-sm font-semibold text-foreground">৳{fmt(i.lineTotal)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-border p-5 space-y-3">
        {summary?.coupon?.applied ? (
          <div className="flex items-center justify-between rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs">
            <span className="text-emerald-300">
              <b>{summary.coupon.code}</b> applied{summary.coupon.description ? ` — ${summary.coupon.description}` : ""}
            </span>
            <button type="button" onClick={onRemoveCoupon} className="font-bold text-foreground/80 hover:text-foreground">Remove</button>
          </div>
        ) : (
          <form onSubmit={apply} className="flex gap-2">
            <label htmlFor="coupon" className="sr-only">Coupon code</label>
            <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="h-10 min-w-0 flex-1 rounded border border-border bg-muted px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-brand-orange focus:outline-none" />
            <button type="submit" disabled={busy || !code.trim()} className="h-10 rounded bg-secondary px-4 text-xs font-black uppercase tracking-wide text-foreground hover:bg-secondary disabled:opacity-50">
              {busy ? "…" : "Apply"}
            </button>
          </form>
        )}
        {err && <p role="alert" className="text-xs text-red-400">{err}</p>}
        {couponCode && !summary?.coupon?.applied && !err && loading === false && <p className="text-xs text-amber-300">Coupon “{couponCode}” could not be applied.</p>}

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd className="text-foreground">৳{fmt(summary?.subtotal ?? 0)}</dd></div>
          {!!summary?.discountAmount && <div className="flex justify-between text-emerald-300"><dt>Discount</dt><dd>− ৳{fmt(summary.discountAmount)}</dd></div>}
          <div className="flex justify-between text-muted-foreground">
            <dt>Shipping {summary?.shipping.zoneLabel ? <span className="text-muted-foreground/70">({summary.shipping.zoneLabel})</span> : null}</dt>
            <dd className="text-foreground">{summary?.shipping.isFree ? <span className="text-emerald-300">Free</span> : `৳${fmt(summary?.shippingCost ?? 0)}`}</dd>
          </div>
          {summary && !summary.shipping.isFree && summary.shipping.amountForFreeShipping ? (
            <p className="text-xs text-accent-text">Add ৳{fmt(summary.shipping.amountForFreeShipping)} more for free shipping.</p>
          ) : null}
          <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
            <dt className="text-foreground">Total</dt>
            <dd className="font-outfit text-xl font-black text-accent-text">৳{fmt(summary?.total ?? 0)}</dd>
          </div>
        </dl>
        {summary && <p className="text-xs text-muted-foreground/70">Delivery in {summary.shipping.estimatedMinDays}–{summary.shipping.estimatedMaxDays} days.</p>}
      </div>
    </aside>
  );
}
