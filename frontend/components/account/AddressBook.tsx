"use client";

import { btnGhost, btnOrange, card, inputBase, Skeleton } from "@/components/account/ui";
import { errorMessage } from "@/lib/api/client";
import { createAddress, deleteAddress, getAddresses, setDefaultAddress, updateAddress, type AddressInput, type SavedAddress } from "@/lib/services/addresses.service";
import { getDistricts, getDivisions, getUpazilas, type Place } from "@/lib/services/checkout.service";
import { AlertCircle, Briefcase, Home, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const EMPTY: AddressInput = { label: "", fullName: "", phone: "", line1: "", division: "", district: "", upazila: "", postalCode: "", isDefault: false };

function AddressForm({ initial, onDone, onCancel }: { initial?: SavedAddress; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState<AddressInput>(
    initial
      ? { label: initial.label ?? "", fullName: initial.fullName, phone: initial.phone, line1: initial.line1, division: initial.division ?? "", district: initial.district ?? "", upazila: initial.upazila ?? "", postalCode: initial.postalCode ?? "", isDefault: initial.isDefault }
      : EMPTY,
  );
  const [divisions, setDivisions] = useState<Place[]>([]);
  const [districts, setDistricts] = useState<Place[]>([]);
  const [upazilas, setUpazilas] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDivisions().then(setDivisions).catch(() => setDivisions([]));
  }, []);
  const divId = divisions.find((d) => d.name === f.division)?.id;
  const disId = districts.find((d) => d.name === f.district)?.id;
  useEffect(() => {
    if (divId) getDistricts(divId).then(setDistricts).catch(() => setDistricts([]));
  }, [divId]);
  useEffect(() => {
    if (disId) getUpazilas(disId).then(setUpazilas).catch(() => setUpazilas([]));
  }, [disId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.fullName.trim().length < 2 || f.line1.trim().length < 5) return setError("Enter the name and the full address");
    if (!/^(\+?88)?01[3-9]\d{8}$/.test(f.phone.replace(/[\s-]/g, ""))) return setError("Enter a valid mobile number");
    if (!f.district) return setError("Choose a district");
    setBusy(true);
    setError(null);
    const body = { ...f, phone: f.phone.replace(/[\s-]/g, ""), label: f.label || undefined, division: f.division || undefined, district: f.district || undefined, upazila: f.upazila || undefined, city: f.district || undefined };
    try {
      if (initial) await updateAddress(initial.id, body);
      else await createAddress(body);
      toast.success("Address saved");
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const lbl = "mb-1.5 block text-xs font-bold text-muted-foreground";
  return (
    <form onSubmit={save} noValidate className="animate-fade-slide-up space-y-4 rounded border-2 border-brand-orange/40 bg-background p-4 sm:p-5">
      <p className="font-outfit text-base font-black text-foreground">{initial ? "Edit address" : "New address"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl}>Label</label>
          <input aria-label="Label" placeholder="Home, Office…" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className={inputBase} />
        </div>
        <div>
          <label className={lbl}>Full name</label>
          <input aria-label="Full name" placeholder="Receiver's name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} className={inputBase} />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input aria-label="Phone" inputMode="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputBase} />
        </div>
        <div>
          <label className={lbl}>Postal code</label>
          <input aria-label="Postal code" inputMode="numeric" placeholder="e.g. 1207" maxLength={4} value={f.postalCode} onChange={(e) => setF({ ...f, postalCode: e.target.value })} className={inputBase} />
        </div>
      </div>
      <div>
        <label className={lbl}>Address</label>
        <input aria-label="Address" placeholder="House, road, area" value={f.line1} onChange={(e) => setF({ ...f, line1: e.target.value })} className={inputBase} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={lbl}>Division</label>
          <select aria-label="Division" value={f.division} onChange={(e) => setF({ ...f, division: e.target.value, district: "", upazila: "" })} className={inputBase}>
            <option value="">Select</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>District</label>
          <select aria-label="District" value={f.district} disabled={!f.division} onChange={(e) => setF({ ...f, district: e.target.value, upazila: "" })} className={inputBase}>
            <option value="">Select</option>
            {districts.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={lbl}>Area</label>
          <select aria-label="Area" value={f.upazila} disabled={!f.district || upazilas.length === 0} onChange={(e) => setF({ ...f, upazila: e.target.value })} className={inputBase}>
            <option value="">Select</option>
            {upazilas.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground">
        <input type="checkbox" checked={!!f.isDefault} onChange={(e) => setF({ ...f, isDefault: e.target.checked })} className="h-4 w-4 accent-(--brand-orange)" />
        Use as my default address
      </label>
      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={btnOrange}>
          {busy ? "Saving…" : "Save address"}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>
          Cancel
        </button>
      </div>
    </form>
  );
}

const iconFor = (label: string | null) => (/office|work/i.test(label ?? "") ? Briefcase : /home|house/i.test(label ?? "") ? Home : MapPin);

export default function AddressBook() {
  const [list, setList] = useState<SavedAddress[] | null>(null);
  const [editing, setEditing] = useState<SavedAddress | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(() => {
    getAddresses().then(setList).catch(() => setList([]));
  }, []);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <section id="addresses" className={`${card} scroll-mt-40 p-5 sm:p-6`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-outfit text-lg font-black text-foreground">Saved addresses</h2>
          <p className="text-sm text-muted-foreground">Pick one at checkout instead of typing it again.</p>
        </div>
        {editing === null && (
          <button type="button" onClick={() => setEditing("new")} className={`${btnGhost} h-10 shrink-0 px-4`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add new
          </button>
        )}
      </div>

      {editing !== null && (
        <div className="mb-5">
          <AddressForm
            initial={editing === "new" ? undefined : editing}
            onDone={() => {
              setEditing(null);
              load();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {list === null ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : list.length === 0 && editing === null ? (
        <div className="flex flex-col items-center rounded border border-dashed border-border py-10 text-center">
          <MapPin className="h-9 w-9 text-muted-foreground/60" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">No saved addresses yet.</p>
          <button type="button" onClick={() => setEditing("new")} className="mt-3 text-sm font-bold text-accent-text hover:underline">
            Add your first address
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((a) => {
            const Icon = iconFor(a.label);
            return (
              <li key={a.id} className={`relative flex flex-col rounded border-2 p-4 transition-colors ${a.isDefault ? "border-brand-orange/60 bg-brand-orange/5" : "border-border bg-background"}`}>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary/10 text-primary dark:text-brand-blue">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-foreground">
                      {a.label || a.fullName}
                      {a.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded bg-brand-orange px-1.5 py-0.5 text-[10px] font-black text-on-orange">
                          <Star className="h-3 w-3" aria-hidden="true" />
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-foreground/80">
                      {a.fullName} · {a.phone}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{[a.line1, a.upazila, a.district, a.division].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3 text-xs font-bold">
                  <button type="button" onClick={() => setEditing(a)} className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-foreground transition-colors hover:bg-secondary">
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </button>
                  {!a.isDefault && (
                    <button type="button" onClick={() => run(() => setDefaultAddress(a.id), "Default address set")} className="inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-foreground transition-colors hover:bg-secondary">
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                      Make default
                    </button>
                  )}
                  {confirmDelete === a.id ? (
                    <span className="ml-auto flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete(null);
                          void run(() => deleteAddress(a.id), "Address removed");
                        }}
                        className="rounded bg-red-600 px-2.5 py-1.5 text-white"
                      >
                        Delete
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(null)} className="rounded px-2.5 py-1.5 text-muted-foreground hover:bg-secondary">
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmDelete(a.id)} className="ml-auto inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-300">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
