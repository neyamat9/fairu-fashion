"use client";

import CategorySidebar from "@/components/layout/CategorySidebar";
import { gsap } from "@/components/motion/gsap";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search";
import type { Brand, Category } from "@/lib/types";
import { ArrowUpRight, Search, Tags, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Kind = "categories" | "brands";

interface BrowseApi {
  open: (kind: Kind) => void;
}
const BrowseContext = createContext<BrowseApi | null>(null);

/** Open the "all categories" / "all brands" modal from anywhere inside the provider. */
export function useBrowse(): BrowseApi {
  return useContext(BrowseContext) ?? { open: () => undefined };
}

export function BrowseProvider({ categories, brands, children }: { categories: Category[]; brands: Brand[]; children: React.ReactNode }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const api = useMemo<BrowseApi>(() => ({ open: setKind }), []);
  const close = useCallback(() => setKind(null), []);
  return (
    <BrowseContext.Provider value={api}>
      {children}
      <CategorySidebar open={kind === "categories"} onClose={close} categories={categories} />
      <BrowseModal kind={kind === "brands" ? "brands" : null} onClose={close} brands={brands} />
    </BrowseContext.Provider>
  );
}

/** A button (or any trigger) that opens one of the modals. */
export function BrowseTrigger({ kind, className, children }: { kind: Kind; className?: string; children: React.ReactNode }) {
  const { open } = useBrowse();
  return (
    <button type="button" onClick={() => open(kind)} aria-haspopup="dialog" className={className}>
      {children}
    </button>
  );
}

/* ───────────────────────── modal ───────────────────────── */

function BrowseModal({ kind, onClose, brands }: { kind: "brands" | null; onClose: () => void; brands: Brand[] }) {
  const [mounted, setMounted] = useState(false);
  const { input: query, setInput: setQuery, query: debounced, clear: clearSearch } = useDebouncedSearch(250);
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const open = kind !== null;
  // a link was chosen: hide at once (no exit animation) so the new page's skeleton is what you see next
  const instant = useRef(false);
  const closeNow = useCallback(() => {
    instant.current = true;
    onClose();
  }, [onClose]);
  // the page-level skeleton appears the instant a link is clicked, so the modal can simply close
  const pick = useCallback(() => closeNow(), [closeNow]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (kind) clearSearch();
  }, [kind, clearSearch]);

  // Esc closes; page scroll is locked while open (the scrollbar gutter is reserved, so nothing shifts)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // entrance / exit
  useEffect(() => {
    if (!mounted || !panel.current || !backdrop.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (open) {
      instant.current = false;
      gsap.killTweensOf([panel.current, backdrop.current]);
      gsap.set([panel.current, backdrop.current], { visibility: "visible" });
      gsap.to(backdrop.current, { opacity: 1, duration: reduce ? 0 : 0.3 });
      gsap.fromTo(panel.current, { y: reduce ? 0 : 40, scale: reduce ? 1 : 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: reduce ? 0 : 0.5, ease: "expo.out" });
      if (!reduce) {
        gsap.fromTo("[data-browse-item]", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: { each: 0.025, amount: 0.5 }, delay: 0.12 });
      }
      const t = setTimeout(() => search.current?.focus({ preventScroll: true }), 250);
      return () => clearTimeout(t);
    }
    gsap.killTweensOf([panel.current, backdrop.current]);
    if (instant.current) {
      gsap.set([panel.current, backdrop.current], { opacity: 0, visibility: "hidden" });
      return;
    }
    gsap.to(backdrop.current, { opacity: 0, duration: reduce ? 0 : 0.25 });
    gsap.to(panel.current, {
      y: reduce ? 0 : 24,
      scale: reduce ? 1 : 0.97,
      opacity: 0,
      duration: reduce ? 0 : 0.25,
      ease: "power2.in",
      onComplete: () => {
        gsap.set([panel.current, backdrop.current], { visibility: "hidden" });
      },
    });
  }, [open, mounted]);

  const q = debounced.toLowerCase();
  const brandList = useMemo(() => brands.filter((b) => !q || b.name.toLowerCase().includes(q)), [brands, q]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2100] flex items-end justify-center sm:items-center sm:p-6" style={{ visibility: "hidden" }} ref={backdrop} data-lenis-prevent>
      {/* dim + blur */}
      <div className="absolute inset-0 bg-brand-navy/70 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="All brands"
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t border border-border bg-background shadow-2xl sm:max-h-[86dvh] sm:max-w-5xl sm:rounded"
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-brand-navy px-5 py-5 text-white sm:px-8 sm:py-6">
          <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rotate-12 bg-brand-orange/25" aria-hidden="true" />
          <span className="pointer-events-none absolute right-24 top-10 hidden h-4 w-4 bg-brand-orange sm:block" aria-hidden="true" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-brand-orange text-on-orange">
                <Tags className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <h2 className="font-outfit text-xl font-extrabold sm:text-2xl">All brands</h2>
                <p className="mt-0.5 text-xs text-white/70 sm:text-sm">
                  {`${brands.length} brands — pick one to see all its products`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-white/25 transition-colors hover:bg-white/15"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" aria-hidden="true" />
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search brands…"
              aria-label="Search brands"
              className="h-11 w-full rounded border border-white/20 bg-white/10 pl-10 pr-3 text-sm text-white placeholder:text-white/55 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/30"
            />
          </div>
        </div>

        {/* Body */}
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6" data-lenis-prevent>
          {brandList.length === 0 ? (
            <Empty text="No brands match your search." />
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {brandList.map((b) => (
                <li key={b.slug} data-browse-item>
                  <Link
                    href={`/products?brand=${b.slug}`}
                    onClick={pick}
                    className="group relative flex h-full flex-col items-center gap-3 rounded border border-border bg-card p-4 text-center transition-colors hover:border-brand-orange"
                  >
                    <span className="flex h-16 w-full items-center justify-center rounded bg-white p-2 dark:bg-white">
                      {b.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.logoUrl} alt={`${b.name} logo`} className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105" loading="lazy" draggable={false} />
                      ) : (
                        <span className="font-outfit text-lg font-extrabold text-primary">{b.name}</span>
                      )}
                    </span>
                    <span>
                      <span className="block font-outfit text-sm font-bold text-foreground group-hover:text-accent-text">{b.name}</span>
                      <span className="text-xs text-muted-foreground">{b.productCount} products</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-5 py-3.5 sm:px-8">
          <p className="hidden text-xs text-muted-foreground sm:block">Tip: press Esc to close</p>
          <Link
            href="/products"
            onClick={pick}
            className="ml-auto inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse all products
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-14 text-center text-sm font-medium text-muted-foreground">{text}</p>;
}
