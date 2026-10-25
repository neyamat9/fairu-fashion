"use client";

import RequireLogin from "@/components/account/RequireLogin";
import OrderReview from "@/components/checkout/OrderReview";
import OrderSummaryPanel from "@/components/checkout/OrderSummaryPanel";
import { CheckoutBodySkeleton } from "@/components/skeletons/CheckoutSkeletons";
import PaymentSelector from "@/components/checkout/PaymentSelector";
import ShippingForm from "@/components/checkout/ShippingForm";
import StepIndicator from "@/components/checkout/StepIndicator";
import { errorMessage } from "@/lib/api/client";
import { useCart } from "@/lib/hooks/use-cart";
import { useAuth } from "@/lib/hooks/use-auth";
import { loadSavedAddresses, peekSavedAddresses, toCheckoutAddress } from "@/lib/checkout-prefill";
import type { SavedAddress } from "@/lib/services/addresses.service";
import { estimateForDistrict } from "@/lib/checkout-shipping";
import { clearStoredCoupon, getStoredCoupon, storeCoupon } from "@/lib/coupon-store";
import { applyCoupon, getCheckoutSummary, type CheckoutSummary } from "@/lib/services/checkout.service";
import { getSiteSettings, type SiteSettings } from "@/lib/services/site.service";
import { MOBILE_METHODS, type CheckoutAddress, type PaymentMethod } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const LABEL: Record<string, PaymentMethod> = { CASH_ON_DELIVERY: "Cash on Delivery", BKASH: "bKash", NAGAD: "Nagad", ROCKET: "Rocket" };

/**
 * Checkout: 1 delivery details → 2 payment → 3 review & place order.
 * Prices, shipping, coupon discount and the total all come from the server,
 * so what the customer sees is exactly what the order will say.
 * Only signed-in customers get here; their default saved address fills step 1 in advance.
 */
function Checkout() {
  const { user } = useAuth();
  const { cart, cartCount, loading: cartLoading, clearCart } = useCart();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [address, setAddress] = useState<CheckoutAddress | null>(null);
  const [payment, setPayment] = useState<PaymentMethod | null>(null);
  const [txn, setTxn] = useState("");
  const [sender, setSender] = useState("");
  const [coupon, setCoupon] = useState(() => getStoredCoupon());
  const [summary, setSummary] = useState<CheckoutSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const placed = useRef(false);
  // the district currently picked in the form (before it is submitted) — delivery is priced from it live
  const [formDistrict, setFormDistrict] = useState<string | null>(null);
  const district = formDistrict ?? address?.district ?? "";
  const summarySeq = useRef(0);
  // the moment a different district is picked, show the delivery charge for it (from the shop's settings) — the server confirms right after
  const summaryRef = useRef<CheckoutSummary | null>(null);
  const settingsRef = useRef<SiteSettings | null>(null);

  // saved addresses: loaded when the cart button was pressed, otherwise now. The form waits for them (never for long).
  const [saved, setSaved] = useState<SavedAddress[] | null>(() => (user ? peekSavedAddresses(user.id) : null));
  useEffect(() => {
    if (!user || saved !== null) return;
    let alive = true;
    loadSavedAddresses(user.id).then((l) => alive && setSaved(l));
    return () => {
      alive = false;
    };
  }, [user, saved]);
  // the default (else newest) saved address becomes the starting address, so delivery cost shows at once
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || saved === null) return;
    prefilled.current = true;
    if (saved.length > 0) setAddress((a) => a ?? toCheckoutAddress(saved[0]));
  }, [saved]);

  useEffect(() => {
    getSiteSettings().then(setSettings);
  }, []);
  useEffect(() => {
    summaryRef.current = summary;
    settingsRef.current = settings;
  }, [summary, settings]);
  const lastDistrict = useRef(district);
  useEffect(() => {
    if (lastDistrict.current === district) return;
    lastDistrict.current = district;
    const guess = estimateForDistrict(summaryRef.current, settingsRef.current, district);
    if (guess) setSummary(guess);
  }, [district]);

  // Empty cart → back to the cart (but not right after placing an order)
  useEffect(() => {
    if (!cartLoading && cartCount === 0 && !placed.current) router.replace("/cart");
  }, [cartLoading, cartCount, router]);

  const refresh = useCallback(async () => {
    const mine = ++summarySeq.current;
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const s = await getCheckoutSummary({ couponCode: coupon || undefined, district: district || undefined, phone: address?.phone || undefined });
      if (mine === summarySeq.current) setSummary(s); // ignore an answer for a district that is no longer selected
    } catch (e) {
      if (mine !== summarySeq.current) return;
      setSummaryError(errorMessage(e));
      // a coupon that stopped being valid must not block the checkout
      if (coupon) {
        setCoupon("");
        clearStoredCoupon();
      }
    } finally {
      if (mine === summarySeq.current) setSummaryLoading(false);
    }
  }, [coupon, district, address?.phone]);

  useEffect(() => {
    if (cartLoading || cartCount === 0) return;
    void refresh();
  }, [cartLoading, cartCount, cart.items, refresh]);

  async function handleApply(code: string) {
    const s = await applyCoupon(code, { district: district || undefined, phone: address?.phone || undefined });
    setSummary(s);
    setCoupon(code);
    storeCoupon(code);
  }

  const methods = (settings?.payment.methods ?? ["CASH_ON_DELIVERY"]).map((m) => LABEL[m]);

  if (cartLoading || (cartCount === 0 && !placed.current)) return <CheckoutBodySkeleton />;

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-foreground font-outfit tracking-tight">Checkout</h1>
        <div className="mt-2 h-1 w-16 bg-brand-orange rounded" />
      </div>

      <div className="mb-8 md:mb-10">
        <StepIndicator currentStep={step} />
      </div>

      {summaryError && (
        <p role="alert" className="mb-6 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {summaryError}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="rounded bg-muted border border-border p-6 md:p-8">
          {step === 1 && saved === null && <div className="h-[26rem] animate-pulse rounded bg-secondary" aria-busy="true" aria-label="Loading your addresses" />}
          {step === 1 && saved !== null && (
            <ShippingForm
              initialData={address ?? (saved.length > 0 ? toCheckoutAddress(saved[0]) : user ? { fullName: user.name, phone: user.phone } : undefined)}
              saved={saved ?? []}
              onDistrictChange={setFormDistrict}
              onSubmit={(a) => {
                setAddress(a);
                setStep(2);
              }}
            />
          )}

          {step === 2 && (
            <PaymentSelector
              methods={methods}
              accounts={{ bKash: settings?.payment.bkash ?? null, Nagad: settings?.payment.nagad ?? null, Rocket: settings?.payment.rocket ?? null }}
              total={summary?.total ?? null}
              selected={payment}
              onSelect={setPayment}
              transactionId={txn}
              onTransactionIdChange={setTxn}
              senderNumber={sender}
              onSenderNumberChange={setSender}
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
            />
          )}

          {step === 3 && address && payment && summary && (
            <OrderReview
              summary={summary}
              address={address}
              paymentMethod={payment}
              bkashTransactionId={MOBILE_METHODS.includes(payment) ? txn.trim() : undefined}
              bkashSenderNumber={MOBILE_METHODS.includes(payment) ? sender.replace(/[\s-]/g, "") : undefined}
              couponCode={summary.coupon?.applied ? summary.coupon.code : undefined}
              onBack={() => setStep(2)}
              onOrderPlaced={() => {
                placed.current = true;
    clearStoredCoupon();
                void clearCart();
              }}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          <OrderSummaryPanel summary={summary} loading={summaryLoading} couponCode={coupon} onApplyCoupon={handleApply} onRemoveCoupon={() => {
            setCoupon("");
            clearStoredCoupon();
          }} />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireLogin fallback={<CheckoutBodySkeleton />}>
      <Checkout />
    </RequireLogin>
  );
}
