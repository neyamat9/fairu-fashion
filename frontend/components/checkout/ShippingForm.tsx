"use client";

import { errorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/use-auth";
import type { SavedAddress } from "@/lib/services/addresses.service";
import { getDistricts, getDivisions, getUpazilas, type Place } from "@/lib/services/checkout.service";
import type { CheckoutAddress } from "@/lib/types";
import { useEffect, useState } from "react";

interface ShippingFormProps {
  initialData?: Partial<CheckoutAddress>;
  /** the customer's saved addresses (already loaded by the checkout page) */
  saved: SavedAddress[];
  /** called with the district as soon as it is picked (and once on load), so the order summary can price delivery live */
  onDistrictChange?: (district: string) => void;
  onSubmit: (data: CheckoutAddress) => void;
}

type Errors = Partial<Record<keyof CheckoutAddress, string>>;

const input = (bad: boolean) =>
  [
    "w-full px-4 py-3 rounded bg-muted border text-foreground placeholder:text-muted-foreground/70 text-sm transition-all duration-200 outline-none focus:bg-secondary",
    bad ? "border-red-500/60 focus:border-red-500" : "border-border focus:border-brand-orange focus:shadow-[0_0_0_3px_rgba(249,155,16,0.15)]",
  ].join(" ");

function Field({ id, label, required, error, children }: { id: string; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground/80 mb-1.5">
        {label}
        {required && <span className="text-accent-text ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

/** Step 1 — who and where. Division → district → area come from the server. */
export default function ShippingForm({ initialData, saved, onDistrictChange, onSubmit }: ShippingFormProps) {
  const { user } = useAuth();
  const [f, setF] = useState<CheckoutAddress>({
    fullName: initialData?.fullName ?? user?.name ?? "",
    phone: initialData?.phone ?? user?.phone ?? "",
    email: initialData?.email ?? "",
    address: initialData?.address ?? "",
    division: initialData?.division ?? "",
    district: initialData?.district ?? "",
    upazila: initialData?.upazila ?? "",
    postalCode: initialData?.postalCode ?? "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [divisions, setDivisions] = useState<Place[]>([]);
  const [districts, setDistricts] = useState<Place[]>([]);
  const [upazilas, setUpazilas] = useState<Place[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getDivisions().then(setDivisions).catch((e) => setLoadError(errorMessage(e)));
  }, []);

  const divId = divisions.find((d) => d.name === f.division)?.id;
  const disId = districts.find((d) => d.name === f.district)?.id;
  useEffect(() => {
    if (!divId) return;
    let alive = true;
    getDistricts(divId).then((r) => alive && setDistricts(r)).catch(() => alive && setDistricts([]));
    return () => {
      alive = false;
    };
  }, [divId]);
  useEffect(() => {
    if (!disId) return;
    let alive = true;
    getUpazilas(disId).then((r) => alive && setUpazilas(r)).catch(() => alive && setUpazilas([]));
    return () => {
      alive = false;
    };
  }, [disId]);

  useEffect(() => {
    onDistrictChange?.(f.district);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.district]);

  function set<K extends keyof CheckoutAddress>(k: K, v: CheckoutAddress[K]) {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function fillFrom(a: SavedAddress) {
    setF((p) => ({ ...p, fullName: a.fullName, phone: a.phone, address: a.line1, division: a.division ?? "", district: a.district ?? "", upazila: a.upazila ?? "", postalCode: a.postalCode ?? "" }));
    setErrors({});
  }

  function validate(): Errors {
    const e: Errors = {};
    if (f.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Enter a valid mobile number, e.g. 01712345678";
    if (!user && f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Enter a valid email";
    if (!f.division) e.division = "Choose your division";
    if (!f.district) e.district = "Choose your district";
    if (f.address.trim().length < 5) e.address = "Enter your house, road and area";
    if (f.postalCode.trim() && !/^\d{4}$/.test(f.postalCode.trim())) e.postalCode = "Postal code is 4 digits";
    return e;
  }

  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSubmit({ ...f, fullName: f.fullName.trim(), phone: f.phone.replace(/[\s-]/g, ""), email: f.email.trim(), address: f.address.trim(), postalCode: f.postalCode.trim() });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-foreground font-outfit">Delivery details</h2>
        <p className="text-sm text-muted-foreground/70 mt-1">Where should we deliver your order?</p>
        {saved.length > 0 && <p className="mt-2 text-xs text-muted-foreground">We filled this in from your saved address. Change anything you like — your saved addresses stay as they are.</p>}
      </div>

      {saved.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {saved.map((a) => (
            <button key={a.id} type="button" onClick={() => fillFrom(a)} aria-pressed={f.address === a.line1 && f.district === (a.district ?? "")} className={`rounded border-2 px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:border-brand-orange/60 ${f.address === a.line1 && f.district === (a.district ?? "") ? "border-brand-orange bg-brand-orange/10" : "border-border bg-card"}`}>
              <b className="block text-foreground">{a.label || a.fullName}</b>
              {a.line1}, {a.district}
            </button>
          ))}
        </div>
      )}

      {loadError && <p role="alert" className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{loadError}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="fullName" label="Full name" required error={errors.fullName}>
          <input id="fullName" autoComplete="name" value={f.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="e.g. Rahim Uddin" className={input(!!errors.fullName)} aria-invalid={!!errors.fullName} />
        </Field>
        <Field id="phone" label="Mobile number (the courier calls this)" required error={errors.phone}>
          <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="01XXXXXXXXX" className={input(!!errors.phone)} aria-invalid={!!errors.phone} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="division" label="Division" required error={errors.division}>
          <select id="division" value={f.division} onChange={(e) => setF((p) => ({ ...p, division: e.target.value, district: "", upazila: "" }))} className={input(!!errors.division)}>
            <option value="">Select…</option>
            {divisions.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </Field>
        <Field id="district" label="District" required error={errors.district}>
          <select id="district" value={f.district} disabled={!f.division} onChange={(e) => setF((p) => ({ ...p, district: e.target.value, upazila: "" }))} className={input(!!errors.district)}>
            <option value="">Select…</option>
            {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </Field>
        <Field id="upazila" label="Area / Thana" error={errors.upazila}>
          <select id="upazila" value={f.upazila} disabled={!f.district || upazilas.length === 0} onChange={(e) => set("upazila", e.target.value)} className={input(false)}>
            <option value="">Select…</option>
            {upazilas.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_160px]">
        <Field id="address" label="Address" required error={errors.address}>
          <input id="address" autoComplete="street-address" value={f.address} onChange={(e) => set("address", e.target.value)} placeholder="House / flat, road, area" className={input(!!errors.address)} aria-invalid={!!errors.address} />
        </Field>
        <Field id="postalCode" label="Postal code" error={errors.postalCode}>
          <input id="postalCode" inputMode="numeric" maxLength={4} autoComplete="postal-code" value={f.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="1207" className={input(!!errors.postalCode)} />
        </Field>
      </div>

      <button type="submit" className="w-full py-4 rounded bg-brand-orange text-foreground font-black text-base hover:bg-brand-orange/90 active:scale-[0.97] transition-all shadow-[0_8px_24px_rgba(249,155,16,0.3)]">
        Continue to payment →
      </button>
    </form>
  );
}
