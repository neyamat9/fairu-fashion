import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate, useNavigationType } from "react-router";
import { ArrowUp, ExternalLink, Search, Volume2, VolumeX, LogOut, Moon, Menu, Sun, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { assetUrl } from "@/api/client";
import { useAuth } from "@/store/auth";
import { useUi } from "@/store/ui";
import { cn } from "@/lib/utils";
import { ConfirmProvider } from "@/hooks/useConfirm";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette } from "./CommandPalette";
import { SyncPill } from "./SyncPill";
import { chime, useLiveOrders } from "@/hooks/useLiveOrders";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { dark, toggleDark, sound, toggleSound } = useUi();
  useLiveOrders();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const navType = useNavigationType();
  const main = useRef<HTMLElement>(null);
  const tops = useRef(new Map<string, number>());
  const lastTop = useRef(0);
  const [showTop, setShowTop] = useState(false);
  const [palette, setPalette] = useState(false);
  const routeKey = pathname + search;

  // each page remembers how far you had scrolled: Back returns to the same spot, a new page starts at the top
  useLayoutEffect(() => {
    const el = main.current;
    if (!el) return;
    const saved = tops.current;
    const want = navType === "POP" ? (saved.get(routeKey) ?? 0) : 0;
    el.scrollTop = want;
    lastTop.current = want;
    let raf = 0;
    const until = performance.now() + 1500;
    const settle = () => {
      // the page may still be loading (shorter than the saved spot): keep trying briefly
      if (want > 0 && Math.abs(el.scrollTop - want) > 2 && performance.now() < until) {
        el.scrollTop = want;
        raf = requestAnimationFrame(settle);
      }
    };
    if (want > 0) raf = requestAnimationFrame(settle);
    return () => {
      cancelAnimationFrame(raf);
      saved.set(routeKey, lastTop.current);
    };
  }, [routeKey, navType]);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const t = e.currentTarget.scrollTop;
    lastTop.current = t;
    setShowTop((v) => (v === t > 700 ? v : t > 700));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const rawSite = ((import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined) ?? "").trim() || "https://www.fairufashion.com";
  const siteUrl = /^https?:\/\//i.test(rawSite) ? rawSite : `https://${rawSite}`; // a bare "www.…" would be read as a relative link

  return (
    <ConfirmProvider>
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-14 shrink-0 items-center gap-1 border-b border-border bg-card px-2 sm:gap-2 sm:px-3">
          <button
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <button
            type="button"
            onClick={() => setPalette(true)}
            aria-label="Quick search"
            title="Quick search (Ctrl K)"
            className="flex h-9 min-w-9 cursor-pointer items-center gap-2 rounded border border-transparent px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:w-64 md:justify-start md:border-border md:bg-background"
          >
            <Search size={16} />
            <span className="hidden flex-1 text-left md:inline">Search or jump to…</span>
            <kbd className="hidden rounded border border-border bg-card px-1.5 text-[10px] md:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <SyncPill />
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View store"
              aria-label="View store"
              className="flex h-9 items-center gap-1.5 rounded px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ExternalLink size={16} /> <span className="hidden sm:inline">View store</span>
            </a>
            <button
              type="button"
              onClick={() => {
                toggleSound();
                if (!sound) chime();
              }}
              className="hidden size-9 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
              aria-label={sound ? "Mute new-order sound" : "Turn on new-order sound"}
              title={sound ? "New-order sound is on" : "New-order sound is off"}
              aria-pressed={sound}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <button onClick={toggleDark} className="flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer" aria-label="Toggle theme">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 flex items-center gap-2 rounded p-1 pr-2 hover:bg-muted cursor-pointer outline-none">
                  <Avatar className="size-8">
                    {user?.avatarUrl && <AvatarImage src={assetUrl(user.avatarUrl)} />}
                    <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{(user?.name ?? "A").slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left leading-tight sm:block">
                    <span className="block text-[13px] font-semibold">{user?.name}</span>
                    <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{user?.role?.replace("_", " ")}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-semibold">{user?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle /> My profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    toast.success("Signed out");
                    navigate("/login", { replace: true });
                  }}
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main ref={main} onScroll={onScroll} className="custom-scrollbar relative flex-1 overflow-y-auto p-3 sm:p-4 lg:px-5">
          {/* full width; the keyed wrapper replays a short fade/slide on every page change */}
          <div key={pathname} className="page-enter w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <button
        type="button"
        onClick={() => main.current?.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        title="Back to top"
        tabIndex={showTop ? 0 : -1}
        className={cn(
          "no-print fixed bottom-4 right-4 z-30 flex size-10 cursor-pointer items-center justify-center rounded bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:bg-primary/90 active:scale-95",
          showTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <ArrowUp size={18} />
      </button>
      <CommandPalette open={palette} onOpenChange={setPalette} />
      <Toaster position="top-center" />
    </div>
    </ConfirmProvider>
  );
}
