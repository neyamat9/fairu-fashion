"use client";

import { card } from "@/components/account/ui";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import { Skeleton } from "@/components/account/ui";
import { Heart, LayoutDashboard, LogOut, type LucideIcon, Package, RotateCcw, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (path: string) => boolean;
  badge?: number;
}

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

/**
 * Frame for every account page: a profile card with the account menu on the left (desktop),
 * a sticky scrolling tab bar on top (phones), and the page itself on the right.
 * It lives in the account layout, so the menu stays put while you move between pages.
 */
export default function AccountShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { vaultCount } = useWishlist();
  const pathname = usePathname();
  const router = useRouter();

  const items: NavItem[] = [
    { href: "/account", label: "Overview", icon: LayoutDashboard, match: (p) => p === "/account" },
    { href: "/orders", label: "My orders", icon: Package, match: (p) => p.startsWith("/orders") },
    { href: "/wishlist", label: "Wishlist", icon: Heart, match: (p) => p.startsWith("/wishlist"), badge: vaultCount },
    { href: "/account/returns", label: "Returns", icon: RotateCcw, match: (p) => p.startsWith("/account/returns") },
    { href: "/account/settings", label: "Profile & security", icon: Settings, match: (p) => p.startsWith("/account/settings") },
  ];

  async function signOut() {
    await logout();
    router.push("/");
  }

  // a signed-out visitor (the wishlist works for guests) just gets the page, without the account menu
  if (!user && !isLoading) {
    return (
      <section className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-10">
        {/* phones & tablets: scrolling tab bar */}
        <nav
          aria-label="Account menu"
          className="no-scrollbar sticky z-20 -mx-4 mb-5 flex gap-2 overflow-x-auto bg-background/90 px-4 py-2 backdrop-blur transition-[top] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:-mx-6 sm:px-6 lg:hidden"
          style={{ top: "calc(var(--sticky-top, 8rem) - 14px)" }}
         
        >
          {items.map((it) => {
            const on = it.match(pathname);
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={on ? "page" : undefined}
                className={`inline-flex shrink-0 items-center gap-2 rounded border px-3.5 py-2 text-sm font-semibold transition-colors ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-brand-orange"
                }`}
              >
                <it.icon className="h-4 w-4" aria-hidden="true" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        {/* desktop: profile card + menu */}
        <aside className="hidden lg:block">
          <div className="sticky transition-[top] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ top: "var(--sticky-top, 8rem)" }}>
            <div className={`${card} overflow-hidden`}>
              <div className="relative bg-linear-to-br from-primary to-[#1d6ac9] px-5 pb-12 pt-6 text-white">
                <span className="pointer-events-none absolute -right-5 -top-5 h-20 w-20 rotate-12 bg-brand-orange/30" aria-hidden="true" />
                <span className="pointer-events-none absolute right-12 top-14 h-3 w-3 bg-brand-orange" aria-hidden="true" />
                <p className="relative text-xs font-semibold text-white/70">Signed in as</p>
                <p className="relative mt-0.5 h-5 truncate text-sm font-bold">{user?.email}</p>
              </div>
              <div className="relative z-10 -mt-9 px-5 pb-5">
                <span className="flex h-18 w-18 items-center justify-center overflow-hidden rounded border-4 border-card bg-brand-orange font-outfit text-2xl font-black text-on-orange shadow-md">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(user?.name ?? "")
                  )}
                </span>
                {user ? (
                  <>
                    <p className="mt-3 truncate font-outfit text-lg font-black text-foreground">{user.name}</p>
                    {user.createdAt && <p className="text-xs text-muted-foreground">Member since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>}
                  </>
                ) : (
                  <>
                    <Skeleton className="mt-3 h-5 w-32" />
                    <Skeleton className="mt-2 h-3 w-24" />
                  </>
                )}
              </div>
              <nav aria-label="Account menu" className="border-t border-border p-2">
                {items.map((it) => {
                  const on = it.match(pathname);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      aria-current={on ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition-colors ${
                        on ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"
                      }`}
                    >
                      <it.icon className={`h-[18px] w-[18px] ${on ? "" : "text-muted-foreground group-hover:text-accent-text"}`} aria-hidden="true" />
                      <span className="flex-1">{it.label}</span>
                      {!!it.badge && <span className={`rounded px-1.5 py-0.5 text-[11px] font-black ${on ? "bg-white/20" : "bg-brand-orange text-on-orange"}`}>{it.badge}</span>}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={signOut}
                  className="mt-1 flex w-full items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-300"
                >
                  <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                  Sign out
                </button>
              </nav>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {children}
        </div>
      </div>
    </section>
  );
}
