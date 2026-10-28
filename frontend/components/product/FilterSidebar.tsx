"use client";

import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search";
import type { Brand, Category } from "@/lib/types";
import { Check, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

export interface FilterState {
  categories: string[];
  /** sub-category slugs ticked under their categories */
  subCategories: string[];
  brands: string[];
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
}

interface FilterSidebarProps {
  categories: Category[];
  brands: Brand[];
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  /** Absolute price bounds from the product set */
  priceMin?: number;
  priceMax?: number;
  /** How many filters are switched on (shown as a badge) */
  activeCount?: number;
  /** Clears every filter */
  onReset?: () => void;
  /** Mobile: controlled open state */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const DEFAULT_PRICE_MIN = 0;
const DEFAULT_PRICE_MAX = 500000;
const money = (n: number) => `৳${n.toLocaleString("en-BD")}`;

export default function FilterSidebar({
  categories,
  brands,
  filters,
  onFiltersChange,
  priceMin = DEFAULT_PRICE_MIN,
  priceMax = DEFAULT_PRICE_MAX,
  activeCount = 0,
  onReset,
  mobileOpen = false,
  onMobileClose,
}: FilterSidebarProps) {
  // Local price state for the dual-handle slider (avoids re-filtering on every drag)
  const [localMin, setLocalMin] = useState(filters.minPrice ?? priceMin);
  const [localMax, setLocalMax] = useState(filters.maxPrice ?? priceMax);
  const { input: brandInput, setInput: setBrandInput, query: brandQuery } = useDebouncedSearch(250);

  // Sync local price when external filters reset
  useEffect(() => {
    setLocalMin(filters.minPrice ?? priceMin);
    setLocalMax(filters.maxPrice ?? priceMax);
  }, [filters.minPrice, filters.maxPrice, priceMin, priceMax]);

  function commitPrice(min = localMin, max = localMax) {
    onFiltersChange({ ...filters, minPrice: min, maxPrice: max });
  }

  const toggle = (key: "categories" | "brands", slug: string) =>
    onFiltersChange({ ...filters, [key]: filters[key].includes(slug) ? filters[key].filter((x) => x !== slug) : [...filters[key], slug] });

  // ticking a category reveals its sub-categories; unticking it also drops the sub-categories chosen under it
  function toggleCategory(cat: Category) {
    const on = filters.categories.includes(cat.slug);
    const owned = new Set(cat.subCategories.map((x) => x.slug));
    onFiltersChange({
      ...filters,
      categories: on ? filters.categories.filter((x) => x !== cat.slug) : [...filters.categories, cat.slug],
      subCategories: on ? filters.subCategories.filter((x) => !owned.has(x)) : filters.subCategories,
    });
  }

  // ticking a sub-category also ticks its parent category
  function toggleSub(cat: Category, subSlug: string) {
    const on = filters.subCategories.includes(subSlug);
    onFiltersChange({
      ...filters,
      categories: filters.categories.includes(cat.slug) ? filters.categories : [...filters.categories, cat.slug],
      subCategories: on ? filters.subCategories.filter((x) => x !== subSlug) : [...filters.subCategories, subSlug],
    });
  }

  const shownBrands = useMemo(() => {
    const q = brandQuery.toLowerCase();
    return q ? brands.filter((b) => b.name.toLowerCase().includes(q)) : brands;
  }, [brands, brandQuery]);

  const content = (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2.5 font-outfit text-base font-extrabold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </span>
          Filters
          {activeCount > 0 && (
            <span className="rounded bg-brand-orange px-1.5 py-0.5 text-[11px] font-bold leading-none text-on-orange" aria-label={`${activeCount} active filters`}>
              {activeCount}
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {onReset && activeCount > 0 && (
            <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-accent-text">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          )}
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className="flex h-8 w-8 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              aria-label="Close filters"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Price */}
      <Section title="Price range">
        <div className="px-1 pb-1 pt-2">
          <DualRangeSlider
            min={priceMin}
            max={priceMax}
            valueMin={localMin}
            valueMax={localMax}
            onChangeMin={setLocalMin}
            onChangeMax={setLocalMax}
            onCommit={() => commitPrice()}
          />
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="rounded border border-border bg-background px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Min</p>
            <p className="font-outfit text-sm font-bold text-foreground">{money(localMin)}</p>
          </div>
          <span className="h-px w-3 bg-border" aria-hidden="true" />
          <div className="rounded border border-border bg-background px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Max</p>
            <p className="font-outfit text-sm font-bold text-foreground">{money(localMax)}</p>
          </div>
        </div>
      </Section>

      {/* Category */}
      <Section title="Category" count={filters.categories.length + filters.subCategories.length}>
        <ul className="no-scrollbar -mx-1 max-h-80 space-y-0.5 overflow-y-auto px-1" data-lenis-prevent>
          {categories.map((cat) => {
            const checked = filters.categories.includes(cat.slug);
            const picked = cat.subCategories.filter((x) => filters.subCategories.includes(x.slug)).length;
            return (
              <Fragment key={cat.slug}>
                <Option id={`cat-${cat.slug}`} label={cat.name} count={cat.productCount} checked={checked} hint={picked > 0 ? `${picked} selected` : undefined} onChange={() => toggleCategory(cat)} />
                {checked && cat.subCategories.length > 0 && (
                  <li>
                    <ul className="ml-[17px] space-y-0.5 border-l border-border pl-2.5" aria-label={`${cat.name} sub-categories`}>
                      {cat.subCategories.map((sub) => (
                        <Option key={sub.slug} small id={`sub-${sub.slug}`} label={sub.name} checked={filters.subCategories.includes(sub.slug)} onChange={() => toggleSub(cat, sub.slug)} />
                      ))}
                    </ul>
                  </li>
                )}
              </Fragment>
            );
          })}
        </ul>
      </Section>

      {/* Brand */}
      <Section title="Brand" count={filters.brands.length}>
        {brands.length > 6 && (
          <div className="relative mb-2.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              type="search"
              placeholder="Search brands…"
              aria-label="Search brands"
              className="h-9 w-full rounded border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
        )}
        <ul className="no-scrollbar -mx-1 max-h-64 space-y-0.5 overflow-y-auto px-1" data-lenis-prevent>
          {shownBrands.map((b) => (
            <Option key={b.slug} id={`brand-${b.slug}`} label={b.name} logo={b.logoUrl} count={b.productCount} checked={filters.brands.includes(b.slug)} onChange={() => toggle("brands", b.slug)} />
          ))}
          {shownBrands.length === 0 && <li className="px-2 py-3 text-center text-xs text-muted-foreground">No brands match.</li>}
        </ul>
      </Section>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────── */}
      <aside
        className="sticky hidden w-72 flex-shrink-0 self-start transition-[top] duration-300 ease-out lg:block overflow-hidden rounded"
        style={{ top: "var(--sticky-top, 5.5rem)", contain: "paint" }}
      >
        <div
          data-lenis-prevent
          className="no-scrollbar max-h-[calc(100vh-var(--sticky-top,5.5rem)-1rem)] overflow-y-auto overscroll-contain rounded border border-border bg-card"
        >
          {content}
        </div>
      </aside>

      {/* ── Mobile bottom drawer ─────────────────────── */}
      <div
        className={`fixed inset-0 z-[2100] bg-brand-navy/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 invisible"
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[2110] flex max-h-[88dvh] flex-col rounded-t border-t border-border bg-card transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          mobileOpen ? "translate-y-0" : "translate-y-full pointer-events-none invisible"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Product filters"
        aria-hidden={!mobileOpen}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded bg-secondary" />
        <div data-lenis-prevent className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {content}
        </div>
        <div className="shrink-0 border-t border-border p-4">
          <button
            type="button"
            onClick={onMobileClose}
            className="w-full rounded bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 active:scale-[0.99]"
          >
            Show results
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function Section({ title, count = 0, children }: { title: string; count?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border last:border-b-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="group flex w-full items-center justify-between px-5 py-4" aria-expanded={open}>
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          {title}
          {count > 0 && <span className="rounded bg-brand-orange/20 px-1.5 py-0.5 text-[10px] font-bold leading-none text-accent-text">{count}</span>}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:text-foreground ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Option({ id, label, checked, onChange, count, logo, small, hint }: { id: string; label: string; checked: boolean; onChange: () => void; count?: number; logo?: string; small?: boolean; hint?: string }) {
  return (
    <li>
      <label
        htmlFor={id}
        className={`group flex cursor-pointer items-center gap-3 rounded px-2 ${small ? "py-1.5" : "py-2"} transition-colors ${checked ? "bg-accent" : "hover:bg-secondary/70"}`}
      >
        <input type="checkbox" id={id} checked={checked} onChange={onChange} className="peer sr-only" />
        <span
          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-all peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange/50 ${
            checked ? "border-brand-orange bg-brand-orange text-on-orange" : "border-input bg-background group-hover:border-brand-orange"
          }`}
          aria-hidden="true"
        >
          {checked && <Check className="h-3 w-3" strokeWidth={3.5} />}
        </span>
        {logo && (
          <span className="flex h-6 w-9 shrink-0 items-center justify-center rounded bg-white p-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" className="max-h-full max-w-full object-contain" loading="lazy" draggable={false} />
          </span>
        )}
        <span className={`min-w-0 flex-1 truncate ${small ? "text-[13px]" : "text-sm"} ${checked ? "font-semibold text-foreground" : "font-medium text-muted-foreground group-hover:text-foreground"}`}>{label}</span>
        {hint && <span className="shrink-0 text-[10px] font-semibold text-accent-text">{hint}</span>}
        {count !== undefined && (
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${checked ? "bg-brand-orange/25 text-accent-text" : "bg-secondary text-muted-foreground"}`}>{count}</span>
        )}
      </label>
    </li>
  );
}

/**
 * Dual-handle range slider built from two overlapping <input type="range"> elements.
 * The lower handle controls the minimum price; the upper handle controls the maximum.
 */
function DualRangeSlider({
  min,
  max,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  onCommit,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  onCommit: () => void;
}) {
  const range = max - min || 1;
  const leftPct = ((valueMin - min) / range) * 100;
  const rightPct = ((valueMax - min) / range) * 100;

  return (
    <div className="relative flex h-6 items-center">
      <div className="absolute left-0 right-0 h-1.5 rounded bg-secondary" />
      <div className="absolute h-1.5 rounded bg-brand-orange" style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }} />

      <input
        type="range"
        min={min}
        max={max}
        step={1000}
        value={valueMin}
        onChange={(e) => onChangeMin(Math.min(Number(e.target.value), valueMax - 1000))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        onKeyUp={onCommit}
        className="range-thumb-orange pointer-events-none absolute h-1.5 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:pointer-events-auto"
        aria-label="Minimum price"
        style={{ zIndex: valueMin > max - 1000 ? 5 : 3 }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={1000}
        value={valueMax}
        onChange={(e) => onChangeMax(Math.max(Number(e.target.value), valueMin + 1000))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        onKeyUp={onCommit}
        className="range-thumb-orange pointer-events-none absolute h-1.5 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:pointer-events-auto"
        aria-label="Maximum price"
        style={{ zIndex: 4 }}
      />
    </div>
  );
}
