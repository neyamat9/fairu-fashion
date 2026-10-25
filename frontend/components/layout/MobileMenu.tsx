"use client";

import { useAuthModal } from "@/components/auth/AuthModal";
import { startNavigation } from "@/components/layout/NavigationGate";
import { gsap } from "@/components/motion/gsap";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCompare } from "@/lib/hooks/use-compare";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import { GitCompareArrows, Heart, LifeBuoy, LogOut, type LucideIcon, Moon, Package, PackageSearch, RotateCcw, Sun, UserRound, X } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

/**
 * The phone menu (☰ in the header, below 640px): account, wishlist, orders, theme… — everything that lives
 * as icons in the header on bigger screens. Slides in from the right; ✕, the backdrop, Esc and any link close it.
 */
export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isLoading, logout } = useAuth();
  const { openAuth } = useAuthModal();
  const { vaultCount } = useWishlist();
  const { compareList } = useCompare();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const panel = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeReady = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const dark = themeReady && resolvedTheme === "dark";

  // a page change, Esc, or a wider screen (the header icons are back) closes it
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const wide = window.matchMedia("(min-width: 640px)");
    const onWide = () => wide.matches && onClose();
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // rows rise in one after another
  useEffect(() => {
    if (!open || !panel.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = gsap.fromTo(panel.current.querySelectorAll("[data-menu-row]"), { x: 22, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.04, delay: 0.1 });
    return () => {
      t.kill();
    };
  }, [open]);

  if (!mounted) return null;

  const items: Item[] = [
    { href: "/orders", label: "My orders", icon: Package },
    { href: "/wishlist", label: "Wishlist", icon: Heart, badge: vaultCount },
    { href: "/compare", label: "Compare", icon: GitCompareArrows, badge: compareList.length },
    { href: "/track-order", label: "Track an order", icon: PackageSearch },
    { href: "/returns-policy", label: "Return policy", icon: RotateCcw },
    { href: "/contact", label: "Contact us", icon: LifeBuoy },
  ];

  const go = (href: string) => {
    onClose();
    startNavigation(href);
  };

  async function signOut() {
    onClose();
    await logout();
    router.push("/");
  }

  return createPortal(
    <>
      <div
        aria-hidden="true"
        data-lenis-prevent
        onClick={onClose}
        className={`fixed inset-0 z-[2100] bg-brand-navy/60 backdrop-blur-sm transition-opacity duration-300 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        ref={panel}
        tabIndex={-1}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-[2110] flex h-full w-full max-w-[340px] flex-col border-l border-border bg-background outline-none transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "translate-x-0 shadow-2xl" : "translate-x-full"}`}
      >
        <div className="flex shrink-0 items-center justify-between bg-brand-navy px-5 py-4 text-white">
          <h2 className="font-outfit text-lg font-extrabold">Menu</h2>
          <button type="button" onClick={onClose} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded border border-white/25 transition-colors hover:bg-white/15">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {/* who is here */}
          <div data-menu-row className="rounded border border-border bg-card p-4">
            {isLoading ? (
              <div className="space-y-2" aria-hidden="true">
                <div className="h-5 w-32 animate-pulse rounded bg-secondary" />
                <div className="h-10 w-full animate-pulse rounded bg-secondary" />
              </div>
            ) : user ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-brand-orange font-outfit text-lg font-black text-on-orange">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(user.name)
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-outfit text-base font-black text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Link href="/account" onClick={() => go("/account")} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  My account
                </Link>
              </>
            ) : (
              <>
                <p className="font-outfit text-base font-black text-foreground">Welcome!</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Sign in to see your orders, wishlist and faster checkout.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openAuth("login");
                    }}
                    className="h-11 rounded bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openAuth("signup");
                    }}
                    className="h-11 rounded border border-border bg-background text-sm font-bold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}
          </div>

          {/* pages */}
          <nav aria-label="Menu" className="mt-3 space-y-1.5">
            {items.map((it) => (
              <Link key={it.href} href={it.href} onClick={() => go(it.href)} data-menu-row className="flex items-center gap-3 rounded border border-border bg-card px-3.5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text">
                <it.icon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
                <span className="flex-1">{it.label}</span>
                {!!it.badge && <span className="rounded bg-brand-orange px-1.5 py-0.5 text-[11px] font-black text-on-orange">{it.badge}</span>}
              </Link>
            ))}
          </nav>

          {/* light / dark */}
          <div data-menu-row className="mt-3 flex items-center justify-between rounded border border-border bg-card px-3.5 py-3">
            <span className="flex items-center gap-3 text-sm font-semibold text-foreground">
              {dark ? <Moon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" /> : <Sun className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />}
              {dark ? "Dark mode" : "Light mode"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-label="Dark mode"
              onClick={() => setTheme(dark ? "light" : "dark")}
              className={`relative h-7 w-12 rounded-full border transition-colors ${dark ? "border-brand-orange bg-brand-orange" : "border-border bg-secondary"}`}
            >
              <span className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all ${dark ? "left-[1.35rem]" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {user && (
          <div className="shrink-0 border-t border-border bg-card px-4 py-3">
            <button type="button" onClick={signOut} className="flex h-11 w-full items-center justify-center gap-2 rounded border border-red-500/40 text-sm font-bold text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-300">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        )}
      </aside>
    </>,
    document.body,
  );
}
