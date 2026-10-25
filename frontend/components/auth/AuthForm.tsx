"use client";

import AuthField from "@/components/auth/AuthField";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { useBlockClose } from "@/components/auth/auth-busy";
import { useMascot } from "@/components/auth/RobotMascot";
import { useAuth } from "@/lib/hooks/use-auth";
import { AlertCircle, ArrowRight, Check, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  mode: AuthMode;
  /** Show the "session ended" notice */
  expired?: boolean;
  /** Called once the success celebration is over (the modal then closes / moves on) */
  onSuccess: () => void;
  /** Start with this email and report edits, so it survives switching between the modal's forms */
  initialEmail?: string;
  onEmailChange?: (email: string) => void;
  /** Switch between login, sign-up and forgot-password inside the modal */
  onSwitchMode: (mode: AuthMode | "forgot") => void;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

type SubmitStatus = "idle" | "loading" | "success" | "error";

/**
 * AuthForm — handles both login and signup modes.
 *
 * - Bright, colourful card contents; the robot mascot (rendered by AuthShell) reacts to what happens here:
 *   it watches text fields, covers its eyes on password fields, thinks while submitting,
 *   cheers on success and looks sad when an attempt fails.
 * - Failure: shake animation + inline error · Success: check mark + page fade-out → redirect.
 */
export default function AuthForm({ mode, expired = false, initialEmail = "", onEmailChange, onSuccess, onSwitchMode }: AuthFormProps) {
  const { login, signup } = useAuth();
  const mascot = useMascot();

  const [form, setForm] = useState<FormState>({ name: "", email: initialEmail, phone: "", password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");

  const formRef = useRef<HTMLFormElement>(null);

  // the robot mirrors the submit state
  useEffect(() => {
    mascot.setStatus(submitStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitStatus]);

  function setField(field: keyof FormState, value: string) {
    if (field === "email") onEmailChange?.(value);
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (errors.general) setErrors((prev) => ({ ...prev, general: undefined }));
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (mode === "signup") {
      if (!form.name.trim()) errs.name = "Full name is required";
      else if (form.name.trim().length < 2) errs.name = "Name must be at least 2 characters";
    }

    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Please enter a valid email address";

    if (mode === "signup") {
      if (form.phone.trim() && !/^(\+?88)?01[3-9]\d{8}$/.test(form.phone.replace(/[\s-]/g, ""))) errs.phone = "Enter a valid mobile number, e.g. 01712345678";
    }

    if (!form.password) errs.password = "Password is required";
    else if (mode === "signup" && form.password.length < 6) errs.password = "Password must be at least 6 characters";

    if (mode === "signup") {
      if (!form.confirmPassword) errs.confirmPassword = "Please confirm your password";
      else if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    }

    return errs;
  }

  function triggerShake() {
    const el = formRef.current;
    if (!el) return;
    el.classList.remove("animate-shake");
    void el.offsetWidth; // force reflow
    el.classList.add("animate-shake");
    setTimeout(() => el.classList.remove("animate-shake"), 450);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      triggerShake();
      mascot.setStatus("error");
      return;
    }

    setSubmitStatus("loading");
    setErrors({});

    try {
      const result =
        mode === "login"
          ? await login(form.email.trim(), form.password)
          : await signup({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.replace(/[\s-]/g, "") || undefined, password: form.password });

      if (result.success) {
        setSubmitStatus("success");
        if (mode === "signup") toast.success("Welcome to Fairu Fashion! Your account is ready.", { duration: 3000 });
        else toast.success("Welcome back!", { duration: 2500 });

        // let the robot celebrate for a moment, then the modal moves on
        setTimeout(onSuccess, 1100);
      } else {
        setSubmitStatus("error");
        setErrors({ general: result.error ?? "Something went wrong. Please try again." });
        triggerShake();
        setTimeout(() => setSubmitStatus("idle"), 500);
      }
    } catch {
      setSubmitStatus("error");
      setErrors({ general: "An unexpected error occurred. Please try again." });
      triggerShake();
      setTimeout(() => setSubmitStatus("idle"), 500);
    }
  }

  const isLoading = submitStatus === "loading";
  const isSuccess = submitStatus === "success";
  const off = isLoading || isSuccess;
  useBlockClose(off);

  // "Email is already registered" → offer the way out
  const alreadyRegistered = mode === "signup" && /already|exist|registered|taken/i.test(errors.general ?? "");

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h1 className="font-outfit text-3xl font-black tracking-tight text-primary dark:text-foreground">
          {mode === "login" ? (
            <>
              Welcome <span className="text-brand-orange">back</span>
            </>
          ) : (
            <>
              Create your <span className="text-brand-orange">account</span>
            </>
          )}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "login" ? "Sign in to see your orders, wishlist and faster checkout" : "Join Fairu Fashion to track orders, save a wishlist and check out faster"}
        </p>
      </div>

      {expired && mode === "login" && (
        <p role="status" className="mb-5 rounded border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm font-medium text-accent-text">
          Your session ended. Please sign in again.
        </p>
      )}

      {errors.general && (
        <div className="mb-5 flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{errors.general}</span>
          {alreadyRegistered && (
            <button type="button" onClick={() => onSwitchMode("login")} className="shrink-0 font-bold underline">
              Sign in instead
            </button>
          )}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        {mode === "signup" && (
          <AuthField id="name" label="Full name" icon={User} value={form.name} onChange={(v) => setField("name", v)} placeholder="e.g. Rahim Uddin" autoComplete="name" error={errors.name} disabled={off} />
        )}

        <AuthField id="email" label="Email address" icon={Mail} type="email" value={form.email} onChange={(v) => setField("email", v)} placeholder="you@example.com" autoComplete="email" error={errors.email} disabled={off} />

        {mode === "signup" && (
          <AuthField id="phone" label="Phone number (optional)" icon={Phone} type="tel" value={form.phone} onChange={(v) => setField("phone", v)} placeholder="01XXXXXXXXX" autoComplete="tel" error={errors.phone} disabled={off} />
        )}

        <AuthField
          id="password"
          label="Password"
          icon={Lock}
          password
          value={form.password}
          onChange={(v) => setField("password", v)}
          placeholder={mode === "login" ? "Enter your password" : "Create a strong password"}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          error={errors.password}
          disabled={off}
        >
          {mode === "signup" && <PasswordStrengthMeter password={form.password} />}
        </AuthField>

        {mode === "signup" && (
          <AuthField id="confirmPassword" label="Confirm password" icon={Lock} password value={form.confirmPassword} onChange={(v) => setField("confirmPassword", v)} placeholder="Repeat your password" autoComplete="new-password" error={errors.confirmPassword} disabled={off} />
        )}

        {mode === "login" && (
          <div className="text-right">
            <button type="button" onClick={() => onSwitchMode("forgot")} className="text-sm font-semibold text-primary transition-colors hover:text-accent-text dark:text-brand-blue">
              Forgot password?
            </button>
          </div>
        )}

        <button
          type="submit"
          disabled={off}
          className={`group relative mt-1 flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded py-3.5 text-base font-bold text-white transition-all duration-300 disabled:cursor-not-allowed ${
            isSuccess
              ? "bg-emerald-600 shadow-[0_10px_28px_-8px_rgba(5,150,105,0.7)]"
              : "bg-linear-to-r from-primary to-[#1d6ac9] shadow-[0_12px_28px_-10px_rgba(5,57,114,0.8)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-10px_rgba(249,155,16,0.6)]"
          }`}
        >
          {!off && <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/20 transition-transform duration-700 group-hover:translate-x-[420%]" aria-hidden="true" />}
          <span className="relative flex items-center gap-2">
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {isSuccess && <Check className="h-5 w-5" strokeWidth={3} aria-hidden="true" />}
            {isLoading ? "Please wait…" : isSuccess ? (mode === "login" ? "Signed in!" : "Account created!") : mode === "login" ? "Sign in" : "Create account"}
            {!off && <ArrowRight className="h-5 w-5 text-brand-orange transition-transform group-hover:translate-x-1" aria-hidden="true" />}
          </span>
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? (
          <>
            Don&apos;t have an account?{" "}
            <button type="button" onClick={() => onSwitchMode("signup")} className="font-bold text-accent-text hover:underline">
              Sign up free
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => onSwitchMode("login")} className="font-bold text-accent-text hover:underline">
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
