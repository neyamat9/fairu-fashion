import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { notificationsApi } from "@/api/notifications";
import { useUi } from "@/store/ui";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { menu } from "./menu";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { collapsed: collapsedPref, toggleCollapsed } = useUi();
  // the icon-only width is a desktop thing; the phone drawer is always full width
  const isDesktop = useIsDesktop();
  const collapsed = collapsedPref && isDesktop;

  // Collapsed on a big screen: pointing at the sidebar (or tabbing into it) opens it over the page, moving away closes it again
  const [peek, setPeek] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const justCollapsed = useRef(false); // after clicking "collapse" stay collapsed until the pointer has left once
  const peekSoon = (on: boolean) => {
    if (on && justCollapsed.current) return;
    if (!on) justCollapsed.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setPeek(on), on ? 90 : 160);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  const expandedNow = !collapsed || peek;
  // "compact" = icons only
  const compact = !expandedNow;

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", isDesktop ? (collapsed ? "68px" : "16rem") : "0px");
  }, [collapsed, isDesktop]);
  const { data: summary } = useQuery({ queryKey: ["attention-summary"], queryFn: notificationsApi.summary, refetchInterval: 30_000 });

  return (
    <>
      {/* phones: the backdrop fades with the drawer instead of popping in and out */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn("fixed inset-0 z-30 bg-navy-950/60 backdrop-blur-[1px] transition-opacity duration-300 ease-out lg:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />
      {/* on desktop this spacer keeps the page's column width; the sidebar itself floats above it so peeking never shoves the page */}
      <div className={cn("hidden shrink-0 transition-[width] duration-300 ease-out lg:block", collapsed ? "w-[68px]" : "w-64")} aria-hidden="true" />
      <aside
        aria-label="Main menu"
        onMouseEnter={() => collapsed && peekSoon(true)}
        onMouseLeave={() => collapsed && peekSoon(false)}
        onFocusCapture={() => collapsed && peekSoon(true)}
        onBlurCapture={(e) => collapsed && !e.currentTarget.contains(e.relatedTarget as Node | null) && peekSoon(false)}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col overflow-hidden border-r border-sidebar-border bg-gradient-to-b from-sidebar to-[#042a55] text-sidebar-foreground will-change-transform dark:to-sidebar",
          "transition-[translate,transform,width,box-shadow,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "visible translate-x-0 shadow-2xl" : "invisible -translate-x-full shadow-none",
          "lg:visible lg:max-w-none lg:translate-x-0 lg:shadow-none",
          compact ? "lg:w-[68px]" : "lg:w-64",
          collapsed && peek && "lg:shadow-2xl",
        )}
      >
        <div className={cn("flex shrink-0 border-b border-sidebar-border", compact ? "flex-col items-center gap-1 py-2" : "h-14 items-center justify-between gap-2 px-3")}>
          <NavLink to="/" className="flex min-w-0 items-center gap-2" onClick={onClose} title="Dashboard">
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-white p-1">
              <img src="/logo-mark.png" alt="Fairu Fashion" className="size-8 object-contain" />
            </span>
            {!compact && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate font-heading text-[15px] font-bold text-white">
                  Fairu <span className="text-orange-400">Fashion</span>
                </span>
                <span className="block text-[10px] uppercase tracking-widest text-navy-300">Admin</span>
              </span>
            )}
          </NavLink>
          {/* top right of the sidebar: collapse / expand on desktop, close on phones */}
          <button
            type="button"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded text-navy-200 transition-colors hover:bg-white/10 hover:text-white active:scale-95 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
          <button
            type="button"
            className="hidden size-8 shrink-0 cursor-pointer items-center justify-center rounded text-navy-200 transition-colors hover:bg-white/10 hover:text-white active:scale-95 lg:flex"
            onClick={() => {
              if (!collapsed) {
                justCollapsed.current = true;
                clearTimeout(timer.current);
                setPeek(false);
              }
              toggleCollapsed();
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-2 py-3">
          {menu.map((section) => (
            <div key={section.title}>
              {!compact && <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-navy-300/70">{section.title}</p>}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const count = summary && item.badge ? item.badge(summary) : 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end ?? item.to === "/"}
                        onClick={onClose}
                        title={compact ? item.label : undefined}
                        className={({ isActive }) =>
                          cn(
                            "group relative flex items-center gap-3 rounded px-2.5 py-2 text-[13px] font-medium transition-colors",
                            isActive ? "bg-white/[0.12] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
                            compact && "justify-center px-0",
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-brand" />}
                            <span className={cn("shrink-0", isActive && "text-orange-400")}>{item.icon}</span>
                            {!compact && <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>}
                            {count > 0 && (
                              <span
                                className={cn(
                                  "rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold leading-none text-brand-foreground",
                                  compact && "absolute right-1 top-0.5 px-1",
                                )}
                              >
                                {count > 99 ? "99+" : count}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

      </aside>
    </>
  );
}
