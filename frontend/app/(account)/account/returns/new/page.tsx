"use client";

import RequireLogin from "@/components/account/RequireLogin";
import { btnPrimary, card, formatBDT, inputBase, PageHeading, Skeleton } from "@/components/account/ui";
import { errorMessage } from "@/lib/api/client";
import { createReturn, getReturnEligibility, type ReturnEligibility } from "@/lib/services/support.service";
import { AlertCircle, ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";

const REASONS = [
  ["DEFECTIVE", "Not working / defective"],
  ["WRONG_ITEM", "I received the wrong item"],
  ["NOT_AS_DESCRIBED", "Not as described"],
  ["SIZE_ISSUE", "Does not fit / size issue"],
  ["DAMAGED_IN_TRANSIT", "Damaged in delivery"],
  ["NO_LONGER_NEEDED", "I no longer need it"],
];

function Form() {
  const router = useRouter();
  const orderId = useSearchParams().get("order") ?? "";
  const [el, setEl] = useState<ReturnEligibility | null>(null);
  const [failed, setFailed] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [cond, setCond] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("DEFECTIVE");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setFailed(true);
      return;
    }
    getReturnEligibility(orderId).then(setEl).catch(() => setFailed(true));
  }, [orderId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const items = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity, condition: cond[orderItemId] || undefined }));
    if (items.length === 0) return setError("Choose at least one item to return");
    setBusy(true);
    setError(null);
    try {
      await createReturn({ orderId, reason, detail: detail.trim() || undefined, items });
      toast.success("Return requested. We'll review it and get back to you.");
      router.push("/account/returns");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const back = (
    <Link href={orderId ? `/orders/${orderId}` : "/orders"} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-accent-text">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to order
    </Link>
  );

  if (failed)
    return (
      <>
        {back}
        <div className={`${card} p-6 text-sm text-muted-foreground`}>
          We could not load this order. Open it from{" "}
          <Link href="/orders" className="font-bold text-accent-text hover:underline">
            My orders
          </Link>
          .
        </div>
      </>
    );
  if (!el)
    return (
      <>
        {back}
        <Skeleton className="h-80" />
      </>
    );

  const picked = Object.values(qty).reduce((s, n) => s + n, 0);

  return (
    <>
      {back}
      <PageHeading title="Return" accent="an item" subtitle={`Order ${el.orderNumber}`} />
      {!el.eligible ? (
        <p role="status" className="flex items-start gap-3 rounded border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-800 dark:text-amber-200">
          <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          {el.reason ?? "This order cannot be returned."}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          {el.returnDeadline && (
            <p className="flex items-center gap-2 rounded border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
              You can return items until <b className="text-foreground">{new Date(el.returnDeadline).toLocaleDateString("en-BD")}</b>.
            </p>
          )}

          <div className={`${card} p-5 sm:p-6`}>
            <h2 className="mb-4 font-outfit text-lg font-black text-foreground">1. What are you returning?</h2>
            <ul className="space-y-3">
              {el.items
                .filter((i) => i.returnableQuantity > 0)
                .map((i) => {
                  const n = qty[i.orderItemId] ?? 0;
                  return (
                    <li key={i.orderItemId} className={`rounded border-2 p-4 transition-colors ${n > 0 ? "border-brand-orange/60 bg-brand-orange/5" : "border-border bg-background"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground">
                            {i.productName}
                            {i.variantName ? ` (${i.variantName})` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatBDT(i.price)} each</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs font-semibold text-muted-foreground" htmlFor={`q-${i.orderItemId}`}>
                            Quantity
                          </label>
                          <select id={`q-${i.orderItemId}`} value={n} onChange={(e) => setQty({ ...qty, [i.orderItemId]: Number(e.target.value) })} className={`${inputBase} h-10 w-20`}>
                            {Array.from({ length: i.returnableQuantity + 1 }, (_, k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                          <select aria-label="Condition" value={cond[i.orderItemId] ?? ""} onChange={(e) => setCond({ ...cond, [i.orderItemId]: e.target.value })} className={`${inputBase} h-10 w-36`}>
                            <option value="">Condition</option>
                            <option>New</option>
                            <option>Opened</option>
                            <option>Damaged</option>
                          </select>
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>

          <div className={`${card} p-5 sm:p-6`}>
            <h2 className="mb-4 font-outfit text-lg font-black text-foreground">2. Why?</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="reason" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                  Reason
                </label>
                <select id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputBase}>
                  {REASONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="detail" className="mb-1.5 block text-xs font-bold text-muted-foreground">
                  Tell us more (optional)
                </label>
                <textarea id="detail" rows={4} maxLength={2000} value={detail} onChange={(e) => setDetail(e.target.value)} className={`${inputBase} h-auto py-3`} />
              </div>
            </div>
          </div>

          {error && (
            <p role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full sm:w-auto`}>
            {busy ? "Sending…" : picked > 0 ? `Request return (${picked} ${picked === 1 ? "item" : "items"})` : "Request return"}
          </button>
        </form>
      )}
    </>
  );
}

export default function NewReturnPage() {
  return (
    <RequireLogin>
      <Suspense fallback={null}>
        <Form />
      </Suspense>
    </RequireLogin>
  );
}
