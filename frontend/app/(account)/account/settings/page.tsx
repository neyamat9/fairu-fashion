"use client";

import AddressBook from "@/components/account/AddressBook";
import ChangePassword from "@/components/account/ChangePassword";
import RequireLogin from "@/components/account/RequireLogin";
import { btnPrimary, card, PageHeading } from "@/components/account/ui";
import AuthField from "@/components/auth/AuthField";
import { useAuth } from "@/lib/hooks/use-auth";
import { AlertCircle, Mail, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function ProfileCard() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // pick up the saved profile when it arrives / changes
  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
  }, [user?.name, user?.phone]);

  const dirty = name.trim() !== (user?.name ?? "") || phone.trim() !== (user?.phone ?? "");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Full name is required");
    if (phone.trim() && !/^(\+?88)?01[3-9]\d{8}$/.test(phone.replace(/[\s-]/g, ""))) return setError("Enter a valid mobile number, e.g. 01712345678");
    setBusy(true);
    setError(null);
    const r = await updateProfile({ name: name.trim(), phone: phone.replace(/[\s-]/g, "") || undefined });
    setBusy(false);
    if (r.success) toast.success("Profile updated");
    else setError(r.error ?? "Could not update your profile");
  }

  return (
    <form onSubmit={save} noValidate className={`${card} p-5 sm:p-6`}>
      <h2 className="font-outfit text-lg font-black text-foreground">Personal details</h2>
      <p className="mb-5 text-sm text-muted-foreground">We use these for delivery updates and your invoices.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField id="profile-name" label="Full name" icon={User} value={name} onChange={setName} placeholder="Your full name" autoComplete="name" disabled={busy} />
        <AuthField id="profile-phone" label="Phone number (optional)" icon={Phone} type="tel" value={phone} onChange={setPhone} placeholder="01XXXXXXXXX" autoComplete="tel" disabled={busy} />
        <div className="sm:col-span-2">
          <AuthField id="profile-email" label="Email (your login — can't be changed here)" icon={Mail} type="email" value={user?.email ?? ""} onChange={() => {}} disabled />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-4 flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !dirty} className={`${btnPrimary} mt-5 w-full sm:w-auto`}>
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export default function SettingsPage() {
  return (
    <RequireLogin>
      <PageHeading title="Profile &" accent="security" subtitle="Your details, delivery addresses and password." />
      <div className="space-y-6">
        <ProfileCard />
        <AddressBook />
        <ChangePassword />
      </div>
    </RequireLogin>
  );
}
