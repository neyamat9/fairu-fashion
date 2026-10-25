"use client";

import RequireLogin from "@/components/account/RequireLogin";
import { btnGhost, btnPrimary, card, formatBDT, formatDate, formatDateTime, Skeleton, StepProgress } from "@/components/account/ui";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { errorMessage } from "@/lib/api/client";
import { useCart } from "@/lib/hooks/use-cart";
import { cancelOrder, getOrderById, openInvoice, reorder } from "@/lib/services/orders.service";
import { MOBILE_METHODS, type Order } from "@/lib/types";
import { ArrowLeft, Banknote, Calendar, CheckCircle2, StickyNote, ExternalLink, FileText, Headset, MapPin, PackageSearch, RotateCcw, RotateCw, Smartphone, Truck, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { isFinished, isOffTrack } from "@/lib/api/mappers";

function Row({ label, value, strong, tone }: { label: string; value: React.ReactNode; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${strong ? "font-black text-foreground" : "text-muted-foreground"} ${tone ?? ""}`}>
      <span>{label}</span>
      <span className={strong ? "text-lg text-accent-text" : "font-semibold text-foreground"}>{value}</span>
    </div>
  );
}

/** Shown once, right after the order was placed (?placed=1). */
function PlacedBanner({ order }: { order: Order }) {
  const mobile = MOBILE_METHODS.includes(order.paymentMethod);
  return (
    <div role="status" className="animate-fade-slide-up relative overflow-hidden rounded border border-emerald-500/40 bg-emerald-500/10 p-5 sm:p-6">
      <span className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rotate-12 bg-brand-orange/20" aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-outfit text-xl font-black text-foreground">Thank you — your order is placed!</h2>
          <p className="mt-1 text-sm text-foreground/85">
            Order <b className="font-mono">{order.orderNumber}</b> is on its way into our system.
            {mobile ? ` We will check your ${order.paymentMethod} payment and confirm it shortly.` : " We will confirm it soon and keep you updated here."}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlacedBannerGate({ order }: { order: Order }) {
  return useSearchParams().get("placed") === "1" ? <PlacedBanner order={order} /> : null;
}

function Detail() {
  const { id } = useParams<{ id: string }>();
  const { refreshCart, openCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState<"cancel" | "again" | "invoice" | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getOrderById(id)
      .then((o) => {
        if (!alive) return;
        if (o) {
          setOrder(o);
          setState("ok");
        } else setState("missing");
      })
      .catch(() => alive && setState("missing"));
    return () => {
      alive = false;
    };
  }, [id]);

  async function cancel() {
    if (!order?.canCancel) return;
    setBusy("cancel");
    try {
      setOrder(await cancelOrder(order.id));
      setConfirmCancel(false);
      toast.success("Order cancelled");
    } catch (e) {
      toast.error(errorMessage(e, "Could not cancel the order. Please try again."));
    } finally {
      setBusy(null);
    }
  }

  async function buyAgain() {
    if (!order) return;
    setBusy("again");
    try {
      await reorder(order.id);
      await refreshCart();
      toast.success("Items added to your cart");
      openCart();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function invoice() {
    if (!order) return;
    setBusy("invoice");
    try {
      await openInvoice(order.id);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (state === "loading") {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-36" />
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (state === "missing" || !order) {
    return (
      <div className={`${card} flex flex-col items-center px-6 py-16 text-center`}>
        <PackageSearch className="h-12 w-12 text-muted-foreground/60" aria-hidden="true" />
        <h1 className="mt-4 font-outfit text-2xl font-black text-foreground">Order not found</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">We couldn&apos;t find this order in your account.</p>
        <Link href="/orders" className={`${btnPrimary} mt-6`}>
          Back to my orders
        </Link>
      </div>
    );
  }

  const addr = order.shippingAddress;
  const cod = order.paymentMethod === "Cash on Delivery";

  return (
    <div className="space-y-5">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-accent-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All orders
      </Link>

      <Suspense fallback={null}>
        <PlacedBannerGate order={order} />
      </Suspense>

      {/* summary header */}
      <div className={`${card} overflow-hidden`}>
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold text-muted-foreground">Order</p>
            <h1 className="break-all font-mono text-xl font-black text-primary dark:text-foreground sm:text-2xl">{order.orderNumber}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                Placed {formatDate(order.placedAt)}
              </span>
              {!isFinished(order.status) && (
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="h-4 w-4" aria-hidden="true" />
                  Arrives by <b className="text-foreground">{formatDate(order.estimatedDelivery)}</b>
                </span>
              )}
            </p>
          </div>
          <StatusBadge status={order.status} className="px-3 py-1.5 text-xs" />
        </div>

        <div className="border-t border-border bg-secondary/40 px-5 py-6 sm:px-8">
          <StepProgress order={order} timestamps />
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border p-4 sm:px-6">
          <button type="button" onClick={invoice} disabled={busy === "invoice"} className={`${btnGhost} h-10`}>
            <FileText className="h-4 w-4" aria-hidden="true" />
            Invoice
          </button>
          <button type="button" onClick={buyAgain} disabled={busy === "again"} className={`${btnGhost} h-10`}>
            <RotateCw className={`h-4 w-4 ${busy === "again" ? "animate-spin" : ""}`} aria-hidden="true" />
            Buy again
          </button>
          {order.canCancel &&
            (confirmCancel ? (
              <span className="ml-auto flex flex-wrap items-center gap-2 rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm">
                <span className="font-semibold text-red-700 dark:text-red-300">Cancel this order?</span>
                <button type="button" onClick={cancel} disabled={busy === "cancel"} className="rounded bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">
                  {busy === "cancel" ? "Cancelling…" : "Yes, cancel"}
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className="rounded px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary">
                  Keep order
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmCancel(true)} className="ml-auto inline-flex h-10 items-center gap-2 rounded border border-red-500/40 px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-300">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Cancel order
              </button>
            ))}
        </div>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* items + totals */}
        <div className={`${card} p-5 sm:p-6`}>
          <h2 className="mb-4 font-outfit text-lg font-black text-foreground">
            Items <span className="text-sm font-semibold text-muted-foreground">({order.items.reduce((s, i) => s + i.quantity, 0)})</span>
          </h2>
          <ul className="divide-y divide-border">
            {order.items.map((it, i) => (
              <li key={`${it.productId}-${it.variantLabel ?? "d"}-${i}`} className="flex items-center gap-4 py-3.5 first:pt-0">
                <Link href={`/products/${it.slug}`} className="relative h-18 w-18 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                  <Image src={it.imageUrl} alt={it.name} fill sizes="72px" className="object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${it.slug}`} className="line-clamp-2 text-sm font-bold text-foreground transition-colors hover:text-accent-text">
                    {it.name}
                  </Link>
                  {it.variantLabel && <p className="mt-0.5 text-xs text-muted-foreground">{it.variantLabel}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatBDT(it.price)} × {it.quantity}
                  </p>
                </div>
                <p className="text-sm font-black text-foreground">{formatBDT(it.price * it.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-2 space-y-2.5 border-t border-border pt-4">
            <Row label="Subtotal" value={formatBDT(order.subtotal)} />
            {!!order.discountAmount && <Row label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`− ${formatBDT(order.discountAmount)}`} tone="text-emerald-700 dark:text-emerald-300" />}
            <Row label="Shipping" value={order.shippingCost ? formatBDT(order.shippingCost) : "Free"} />
            <div className="border-t border-border pt-3">
              <Row label="Total" value={formatBDT(order.total)} strong />
            </div>
            {!!order.paidAmount && <Row label="Paid" value={formatBDT(order.paidAmount)} />}
            {!!order.dueAmount && !isOffTrack(order.status) && <Row label={cod ? "To pay on delivery" : "Still to pay"} value={formatBDT(order.dueAmount)} />}
          </div>
        </div>

        {/* side panels */}
        <div className="space-y-5">
          <div className={`${card} p-5`}>
            <h2 className="mb-3 flex items-center gap-2 font-outfit text-base font-black text-foreground">
              <MapPin className="h-4 w-4 text-accent-text" aria-hidden="true" />
              Delivery address
            </h2>
            <address className="space-y-0.5 text-sm not-italic leading-relaxed text-foreground/85">
              <p className="font-bold text-foreground">{addr.fullName}</p>
              <p>{addr.address}</p>
              <p>
                {addr.city}
                {addr.postalCode ? `, ${addr.postalCode}` : ""}
              </p>
              <p className="text-muted-foreground">{addr.phone}</p>
            </address>
            {order.deliveryNote && (
              <p className="mt-3 flex items-start gap-2 rounded border border-border bg-background px-3 py-2 text-xs text-foreground/85">
                <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
                <span>
                  <b>Your delivery note:</b> {order.deliveryNote}
                </span>
              </p>
            )}
          </div>

          <div className={`${card} p-5`}>
            <h2 className="mb-3 font-outfit text-base font-black text-foreground">Payment</h2>
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded ${cod ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-brand-orange/15 text-accent-text"}`}>
                {cod ? <Banknote className="h-5 w-5" aria-hidden="true" /> : <Smartphone className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{order.paymentMethod}</p>
                <p className={`text-xs font-semibold ${order.paymentStatus === "PAID" ? "text-emerald-700 dark:text-emerald-300" : order.paymentStatus === "FAILED" ? "text-red-700 dark:text-red-300" : "text-muted-foreground"}`}>
                  {order.paymentStatus === "PAID"
                    ? "Payment verified"
                    : order.paymentStatus === "FAILED"
                      ? "We could not verify this payment"
                      : order.paymentStatus === "PENDING" && !cod
                        ? "Waiting for us to verify"
                        : order.paymentStatus === "PENDING"
                          ? "Pay on delivery"
                          : (order.paymentStatus ?? "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                </p>
              </div>
            </div>
            {!cod && (order.bkashTransactionId || order.bkashSenderNumber) && (
              <dl className="mt-3 space-y-1.5 rounded border border-border bg-background p-3 text-xs">
                {order.bkashTransactionId && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Transaction ID</dt>
                    <dd className="font-mono font-bold text-foreground">{order.bkashTransactionId}</dd>
                  </div>
                )}
                {order.bkashSenderNumber && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Sent from</dt>
                    <dd className="font-semibold text-foreground">{order.bkashSenderNumber}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-bold text-foreground">{formatBDT(order.total)}</dd>
                </div>
              </dl>
            )}
            {order.paymentVerifiedAt && <p className="mt-2 text-[11px] text-muted-foreground">Checked on {formatDateTime(order.paymentVerifiedAt)}</p>}
          </div>

          {(order.courierName || order.trackingNumber) && (
            <div className={`${card} p-5`}>
              <h2 className="mb-3 flex items-center gap-2 font-outfit text-base font-black text-foreground">
                <Truck className="h-4 w-4 text-accent-text" aria-hidden="true" />
                Courier
              </h2>
              <p className="text-sm font-semibold text-foreground">{order.courierName ?? "Courier"}</p>
              {order.trackingNumber && <p className="mt-0.5 font-mono text-xs text-muted-foreground">Tracking: {order.trackingNumber}</p>}
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-accent-text hover:underline">
                  Track on the courier site <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          )}

          <div className={`${card} p-5`}>
            <h2 className="mb-1 font-outfit text-base font-black text-foreground">Need help?</h2>
            <p className="mb-4 text-sm text-muted-foreground">Questions about this order? We reply here and by email.</p>
            <div className="flex flex-col gap-2">
              <Link href={`/account/support/new?order=${order.id}`} className={`${btnGhost} h-10 justify-start`}>
                <Headset className="h-4 w-4" aria-hidden="true" />
                Contact support
              </Link>
              {order.status === "Delivered" && (
                <Link href={`/account/returns/new?order=${order.id}`} className={`${btnGhost} h-10 justify-start`}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Return an item
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireLogin>
      <Detail />
    </RequireLogin>
  );
}
