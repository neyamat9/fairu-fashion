"use client";

import { useAuthModal } from "@/components/auth/AuthModal";
import { isLeaving } from "@/lib/auth-intent";
import { useAuth } from "@/lib/hooks/use-auth";
import { LogIn, UserRound } from "lucide-react";
import { useEffect } from "react";

function Spinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-brand-orange" />
    </div>
  );
}

/**
 * Shows its children only to a signed-in customer. A signed-out visitor gets a "sign in to continue" card and the
 * sign-in modal opens by itself; after signing in the page appears right here (no redirect, same address).
 * While the customer is deliberately signing out (and heading home) it stays quiet.
 */
export default function RequireLogin({ children, fallback }: { children: React.ReactNode; /** shown while the login is being checked (default: a small spinner) */ fallback?: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { openAuth } = useAuthModal();
  const signedOut = !isLoading && !user;

  useEffect(() => {
    if (signedOut && !isLeaving()) openAuth("login", { then: "stay" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedOut]);

  if (isLoading || (signedOut && isLeaving())) return <>{fallback ?? <Spinner />}</>;
  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded border border-border bg-card p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded bg-primary/10 text-primary dark:text-brand-blue">
            <UserRound className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-4 font-outfit text-2xl font-black text-foreground">Sign in to continue</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your orders, wishlist and account details are waiting for you.</p>
          <button
            type="button"
            onClick={() => openAuth("login", { then: "stay" })}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-brand-orange text-sm font-bold text-on-orange transition-colors hover:bg-brand-orange/90"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

export function PageShell({ eyebrow, title, accent, back, children }: { eyebrow: string; title: string; accent?: string; back?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section>
      <div className="max-w-4xl">
        {back && (
          <a href={back.href} className="mb-4 inline-block text-xs font-bold text-muted-foreground/70 hover:text-foreground">
            ← {back.label}
          </a>
        )}
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-accent-text">{eyebrow}</p>
        <h1 className="font-outfit text-4xl font-black leading-none tracking-tight text-foreground sm:text-5xl">
          {title} {accent && <span className="text-accent-text">{accent}</span>}
        </h1>
        <div className="mb-8 mt-6 h-px bg-gradient-to-r from-brand-orange/30 via-secondary to-transparent" />
        {children}
      </div>
    </section>
  );
}

export const inputCls =
  "w-full rounded border border-border bg-muted px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-brand-orange/50";
export const primaryBtn =
  "rounded bg-brand-orange px-6 py-3 text-xs font-black uppercase tracking-widest text-foreground transition hover:bg-brand-orange/90 active:scale-95 disabled:opacity-50";
