"use client";

import { AuthBusyContext } from "@/components/auth/auth-busy";
import AuthForm from "@/components/auth/AuthForm";
import ForgotForm from "@/components/auth/ForgotForm";
import ResetForm from "@/components/auth/ResetForm";
import { AuthPanel } from "@/components/auth/AuthPanel";
import { gsap } from "@/components/motion/gsap";
import { startNavigation } from "@/components/layout/NavigationGate";
import { useAuth } from "@/lib/hooks/use-auth";
import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Mode = "login" | "signup" | "forgot" | "reset";

export interface OpenAuthOptions {
  /** reset mode: the token from the reset email */
  token?: string;
  /** where to go after signing in: a path, or "stay" to remain on this page (default: /account) */
  then?: string;
  /** show the "your session ended" notice */
  expired?: boolean;
  email?: string;
}

interface AuthModalValue {
  /** Open the sign-in / create-account modal (a signed-in customer is sent to their account instead) */
  openAuth: (mode?: Mode, opts?: OpenAuthOptions) => void;
  closeAuth: () => void;
}

const AuthModalContext = createContext<AuthModalValue | null>(null);

export function useAuthModal(): AuthModalValue {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within an AuthModalProvider");
  return ctx;
}

const TITLES: Record<Mode, string> = { login: "Sign in", signup: "Create account", forgot: "Forgot password", reset: "Choose a new password" };

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Sign-in / sign-up as a modal over whatever page the customer is on, so nothing is lost
 * (scroll position, cart, wishlist). On phones it is a full-screen sheet whose content scrolls top to bottom.
 * It is the only place to sign in: old /login, /signup and /forgot-password links forward to /?auth=…, the reset
 * email lands on /?reset=TOKEN, and pages that need an account open it for signed-out visitors.
 */
export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false); // stays true while the exit animation plays
  const [mode, setMode] = useState<Mode>("login");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [expired, setExpired] = useState(false);
  const [busy, setBusyState] = useState(false);

  const backdrop = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);
  const busyRef = useRef(false);
  const thenRef = useRef("/account");
  const loadingAtOpen = useRef(false);
  const bodyRef = useRef<HTMLDivElement>(null); // the card's content: its height animates between forms
  const innerRef = useRef<HTMLDivElement>(null);
  const fromHeight = useRef<number | null>(null);
  const switching = useRef(false);

  const setBusy = useCallback((b: boolean) => {
    busyRef.current = b;
    setBusyState(b);
  }, []);

  // The modal owns one history entry while open, so the phone's Back button closes it instead of leaving the page.
  const leaveEntry = useCallback((then?: () => void) => {
    if (!(window.history.state as { authModal?: boolean } | null)?.authModal) return then?.();
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      then?.();
    };
    window.addEventListener("popstate", run, { once: true });
    window.history.back();
    setTimeout(run, 400); // popstate should fire; don't hang if it doesn't
  }, []);

  /** Close for good (sign-in finished, or a user appeared) and optionally carry on to a page. */
  const finish = useCallback(
    (dest?: string) => {
      openRef.current = false;
      setOpen(false);
      leaveEntry(() => {
        if (!dest) return;
        startNavigation(dest);
        router.push(dest);
      });
    },
    [leaveEntry, router],
  );

  /** Closed by the visitor (×, backdrop, Esc) — refused while a request is in flight. */
  const closeAuth = useCallback(() => {
    if (busyRef.current || !openRef.current) return;
    openRef.current = false;
    setOpen(false);
    leaveEntry();
  }, [leaveEntry]);

  const openAuth = useCallback(
    (m: Mode = "login", opts: OpenAuthOptions = {}) => {
      if (openRef.current) return; // already open
      if (user && m !== "reset") {
        const dest = opts.then ?? "/account";
        if (dest !== "stay") {
          startNavigation(dest);
          router.push(dest);
        }
        return;
      }
      trigger.current = document.activeElement as HTMLElement | null;
      thenRef.current = opts.then ?? "/account";
      loadingAtOpen.current = isLoading;
      switching.current = false;
      fromHeight.current = null;
      openRef.current = true;
      window.history.pushState({ authModal: true }, "", window.location.href);
      setMode(m);
      setToken(opts.token ?? "");
      setExpired(!!opts.expired);
      if (opts.email !== undefined) setEmail(opts.email);
      setOpen(true);
      setShown(true);
    },
    [user, isLoading, router],
  );

  /**
   * Move between sign in / sign up / forgot / reset smoothly: the current form fades out, the card then glides
   * to the new form's height (taller for sign-up, shorter again for sign-in) while the new form fades in.
   */
  const switchMode = useCallback(
    (next: Mode) => {
      if (busyRef.current || switching.current || next === mode) return;
      const body = bodyRef.current;
      const inner = innerRef.current;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!body || !inner || reduce) {
        setMode(next);
        return;
      }
      switching.current = true;
      fromHeight.current = body.offsetHeight;
      body.style.height = `${body.offsetHeight}px`;
      body.style.overflow = "hidden";
      gsap.killTweensOf([body, inner]);
      gsap.to(inner, { opacity: 0, y: -10, duration: 0.2, ease: "power2.in", onComplete: () => setMode(next) });
    },
    [mode],
  );

  // the new form is in place: measure it, glide the card to that height, fade the form in
  useLayoutEffect(() => {
    const from = fromHeight.current;
    const body = bodyRef.current;
    const inner = innerRef.current;
    if (from === null || !body || !inner) return;
    fromHeight.current = null;
    body.style.height = "auto";
    const to = body.offsetHeight;
    body.style.height = `${from}px`;
    gsap.to(body, {
      height: to,
      duration: 0.6,
      ease: "power3.inOut",
      onComplete: () => {
        body.style.height = "";
        body.style.overflow = "";
        switching.current = false;
      },
    });
    gsap.fromTo(inner, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, delay: 0.18, ease: "power2.out" });
  }, [mode]);

  // Someone signed in while the modal is open: another tab did it → just close; or the click came
  // before the saved login had loaded → go where the click was heading.
  useEffect(() => {
    if (!user || !openRef.current || mode === "reset" || busyRef.current) return;
    finish(loadingAtOpen.current && thenRef.current !== "stay" ? thenRef.current : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // a navigation (anything that changes the page) drops the modal at once
  const firstPath = useRef(true);
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false; // not on the initial mount (a reset-email link opens the modal right then)
      return;
    }
    openRef.current = false;
    setOpen(false);
    setShown(false);
  }, [pathname]);

  // Esc closes, Tab stays inside, Back closes, page scroll is locked while open (the scrollbar gutter is reserved, so nothing shifts)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return closeAuth();
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    const onPop = () => {
      if (busyRef.current) return;
      openRef.current = false;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = "";
    };
  }, [open, closeAuth]);

  // entrance / exit
  useEffect(() => {
    if (!shown || !panel.current || !backdrop.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = !window.matchMedia("(min-width: 640px)").matches;
    gsap.killTweensOf([panel.current, backdrop.current]);

    if (open) {
      gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: reduce ? 0 : 0.3 });
      gsap.fromTo(
        panel.current,
        { y: reduce ? 0 : phone ? 60 : 36, scale: reduce || phone ? 1 : 0.96, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: reduce ? 0 : 0.5, ease: "expo.out" },
      );
      // keyboard users and desktops get the first field; phones don't (it would pop the keyboard over the robot)
      const t = setTimeout(() => {
        const first = panel.current?.querySelector<HTMLElement>("input");
        (phone ? panel.current : first)?.focus({ preventScroll: true });
      }, 320);
      return () => clearTimeout(t);
    }

    gsap.to(backdrop.current, { opacity: 0, duration: reduce ? 0 : 0.2 });
    gsap.to(panel.current, {
      y: reduce ? 0 : 24,
      opacity: 0,
      duration: reduce ? 0 : 0.22,
      ease: "power2.in",
      onComplete: () => {
        setShown(false);
        // the trigger may be gone (the header's sign-in button becomes the account link after signing in)
        const t = trigger.current;
        (t && document.contains(t) ? t : document.querySelector<HTMLElement>('a[aria-label^="Account"]'))?.focus?.({ preventScroll: true });
      },
    });
  }, [open, shown]);

  // switching between the forms starts at the top of the sheet
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [mode]);

  const value = useMemo(() => ({ openAuth, closeAuth }), [openAuth, closeAuth]);

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <DeepLink openAuth={openAuth} />
      </Suspense>
      {shown &&
        createPortal(
          <div ref={backdrop} className="fixed inset-0 z-[2200] flex items-stretch justify-center sm:items-center sm:p-6" data-lenis-prevent>
            <div className="absolute inset-0 bg-brand-navy/70 backdrop-blur-md" onClick={closeAuth} aria-hidden="true" />

            <div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={TITLES[mode]}
              tabIndex={-1}
              className="relative flex h-dvh w-full flex-col overflow-hidden bg-linear-to-br from-[#e3efff] via-[#fbf6ea] to-[#ffe4b8] outline-none dark:from-[#05122b] dark:via-[#0a2350] dark:to-[#123a78] sm:h-auto sm:max-h-[92dvh] sm:max-w-[500px] sm:rounded sm:border sm:border-border sm:shadow-2xl"
            >
              <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky-400/30 blur-3xl dark:bg-sky-500/20" aria-hidden="true" />
              <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-brand-orange/35 blur-3xl dark:bg-brand-orange/15" aria-hidden="true" />

              <button
                type="button"
                onClick={closeAuth}
                aria-label="Close"
                aria-disabled={busy}
                className={`${busy ? "opacity-40" : ""} absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded border border-border bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:border-brand-orange hover:text-accent-text`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

              {/* the scroller: on a small screen the whole sheet scrolls from top to bottom */}
              <div ref={scroller} data-lenis-prevent className="no-scrollbar relative z-10 flex min-h-0 flex-1 justify-center overflow-y-auto overscroll-contain px-4 pb-8 pt-12 sm:px-8 sm:pt-8">
                <AuthBusyContext.Provider value={setBusy}>
                  <AuthPanel compact>
                    <div ref={bodyRef}>
                      <div ref={innerRef}>
                        {mode === "forgot" ? (
                          <ForgotForm key="forgot" initialEmail={email} onEmailChange={setEmail} onBack={() => switchMode("login")} />
                        ) : mode === "reset" ? (
                          <ResetForm key="reset" token={token} onDone={() => switchMode("login")} onRequestNew={() => switchMode("forgot")} />
                        ) : (
                          <AuthForm
                            key={mode}
                            mode={mode}
                            expired={expired && mode === "login"}
                            initialEmail={email}
                            onEmailChange={setEmail}
                            onSuccess={() => finish(thenRef.current === "stay" ? undefined : thenRef.current)}
                            onSwitchMode={switchMode}
                          />
                        )}
                      </div>
                    </div>
                  </AuthPanel>
                </AuthBusyContext.Provider>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </AuthModalContext.Provider>
  );
}

const safePath = (p: string | null) => (p && p.startsWith("/") && !p.startsWith("//") ? p : null);

/**
 * Address-bar entry points into the modal:
 *   /?reset=TOKEN                         the link in the reset email (/reset-password forwards here)
 *   /?auth=login|signup|forgot[&next=/x]  old /login, /signup, /forgot-password links (&session=expired → notice)
 * The parameters are removed from the address bar once handled, so a refresh doesn't reopen the modal.
 */
function DeepLink({ openAuth }: { openAuth: AuthModalValue["openAuth"] }) {
  const search = useSearchParams();
  const { user, isLoading } = useAuth();
  const reset = search.get("reset");
  const auth = search.get("auth");

  const strip = () => {
    const u = new URL(window.location.href);
    ["reset", "auth", "next", "session"].forEach((k) => u.searchParams.delete(k));
    window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
  };

  useEffect(() => {
    if (reset === null) return;
    strip();
    openAuth("reset", { token: reset });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  useEffect(() => {
    if (auth === null || isLoading) return; // wait until we know whether someone is already signed in
    const next = safePath(search.get("next"));
    const expired = search.get("session") === "expired";
    strip();
    if (user || !["login", "signup", "forgot"].includes(auth)) return;
    openAuth(auth as Mode, { then: next ?? "/account", expired });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, isLoading]);

  return null;
}
