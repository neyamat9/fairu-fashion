"use client";

import { gsap } from "@/components/motion/gsap";
import type { Category } from "@/lib/types";
import { ArrowRight, ChevronDown, LayoutGrid, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface CategorySidebarProps {
  open: boolean;
  onClose: () => void;
  categories: Category[];
}

/**
 * Floating "All categories" drawer: every category with its nested sub-categories.
 * Slides in from the left over the page (above the sticky navbar).
 * All categories start collapsed; click the chevron to expand one.
 */
export default function CategorySidebar({ open, onClose, categories }: CategorySidebarProps) {
  const panel = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  // rendered on <body>: the sticky nav has a backdrop blur, which would otherwise trap `fixed` children inside it
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // lock page scroll + focus the panel while open (the scrollbar gutter is permanently reserved, so no page shift)
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // rows rise in one after another each time it opens
  useEffect(() => {
    if (!open || !panel.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rows = panel.current.querySelectorAll("[data-cat-row]");
    const t = gsap.fromTo(rows, { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: "power3.out", stagger: 0.04, delay: 0.12 });
    return () => {
      t.kill();
    };
  }, [open]);

  // start collapsed every time it is reopened
  useEffect(() => {
    if (!open) setExpanded(null);
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        data-lenis-prevent
        onClick={onClose}
        className={`fixed inset-0 z-[2100] bg-brand-navy/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={panel}
        tabIndex={-1}
        data-lenis-prevent
        role="dialog"
        aria-modal="true"
        aria-label="All categories"
        aria-hidden={!open}
        className={`fixed left-0 top-0 z-[2110] flex h-full w-full max-w-[380px] flex-col border-r border-border bg-background outline-none transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between bg-brand-navy px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded bg-brand-orange text-on-orange">
              <LayoutGrid className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <h2 className="font-outfit text-lg font-extrabold">All categories</h2>
              <p className="text-xs text-white/70">{categories.length} categories</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close categories"
            className="flex h-9 w-9 items-center justify-center rounded border border-white/25 transition-colors hover:bg-white/15"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category list */}
        <nav aria-label="All categories" className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-1.5">
            {categories.map((cat) => {
              const isOpen = expanded === cat.slug;
              const hasSubs = cat.subCategories.length > 0;
              return (
                <li key={cat.slug} data-cat-row className="rounded border border-border bg-card">
                  <div className="flex items-stretch">
                    <Link
                      href={`/products?category=${cat.slug}`}
                      onClick={onClose}
                      className="flex min-w-0 flex-1 items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-foreground transition-colors hover:text-accent-text"
                    >
                      <span className="truncate">{cat.name}</span>
                      <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{cat.productCount}</span>
                    </Link>
                    {hasSubs && (
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : cat.slug)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} ${cat.name}`}
                        className="flex w-11 shrink-0 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>

                  {hasSubs && (
                    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                      <div className="overflow-hidden">
                        <ul className="border-t border-border bg-background/60 py-1.5" aria-hidden={!isOpen}>
                          {cat.subCategories.map((sub) => (
                            <li key={sub.slug}>
                              <Link
                                href={`/products?category=${cat.slug}&sub=${sub.slug}`}
                                onClick={onClose}
                                tabIndex={isOpen ? 0 : -1}
                                className="flex items-center gap-2 px-4 py-2 pl-6 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                              >
                                <span className="h-1.5 w-1.5 shrink-0 bg-brand-orange" aria-hidden="true" />
                                {sub.name}
                              </Link>
                            </li>
                          ))}
                          <li>
                            <Link
                              href={`/products?category=${cat.slug}`}
                              onClick={onClose}
                              tabIndex={isOpen ? 0 : -1}
                              className="mx-3 mb-1 mt-1.5 flex items-center justify-center gap-1.5 rounded bg-secondary px-3 py-2 text-xs font-bold text-primary transition-colors hover:bg-accent dark:text-accent-text"
                            >
                              View all {cat.name}
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer: all products */}
        <div className="shrink-0 space-y-3 border-t border-border bg-card px-4 py-4">
          <Link
            href="/products"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Browse all products
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </>,
    document.body,
  );
}
