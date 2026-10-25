"use client";

import AuthField from "@/components/auth/AuthField";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { btnPrimary, card } from "@/components/account/ui";
import { errorMessage } from "@/lib/api/client";
import { changePassword } from "@/lib/services/auth.service";
import { AlertCircle, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ChangePassword() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 6) return setError("The new password needs at least 6 characters");
    if (next !== again) return setError("The two new passwords do not match");
    if (next === cur) return setError("Choose a password different from the current one");
    setBusy(true);
    setError(null);
    try {
      await changePassword(cur, next);
      toast.success("Password changed");
      setCur("");
      setNext("");
      setAgain("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="security" onSubmit={submit} noValidate className={`${card} scroll-mt-40 p-5 sm:p-6`}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-outfit text-lg font-black text-foreground">Password & security</h2>
          <p className="text-sm text-muted-foreground">Use a long password you don&apos;t use anywhere else.</p>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <AuthField id="cur-pw" label="Current password" icon={KeyRound} password value={cur} onChange={setCur} autoComplete="current-password" disabled={busy} />
        </div>
        <AuthField id="new-pw" label="New password" icon={Lock} password value={next} onChange={setNext} autoComplete="new-password" disabled={busy}>
          <PasswordStrengthMeter password={next} />
        </AuthField>
        <AuthField id="again-pw" label="Repeat new password" icon={Lock} password value={again} onChange={setAgain} autoComplete="new-password" disabled={busy} />
      </div>
      {error && (
        <p role="alert" className="mt-4 flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !cur || !next} className={`${btnPrimary} mt-5 w-full sm:w-auto`}>
        {busy ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
