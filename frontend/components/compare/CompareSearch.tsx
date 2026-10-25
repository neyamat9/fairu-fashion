"use client";

import { MAX_COMPARE } from "@/lib/context/CompareContext";
import { useDebouncedSearch } from "@/lib/hooks/use-debounced-search";
import { searchProducts } from "@/lib/services/products.service";
import type { Product } from "@/lib/types";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  /** slugs already being compared */
  selected: string[];
  onAdd: (product: Product) => void;
}

/** "Add a product to compare": a debounced search box (the site-wide useDebouncedSearch) with a result list; picking a result adds it. */
export default function CompareSearch({ selected, onAdd }: Props) {
  const { input, setInput, query, clear } = useDebouncedSearch(300);
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const full = selected.length >= MAX_COMPARE;

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    let alive = true;
    setLoading(true);
    searchProducts(query)
      .then((r) => alive && setResults(r.slice(0, 8)))
      .catch(() => alive && setResults([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query]);

  useEffect(() => {
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  function pick(p: Product) {
    if (full || selected.includes(p.slug)) return;
    onAdd(p);
    clear();
    setResults([]);
    setOpen(false);
    setActive(-1);
  }

  const showList = open && !full && input.trim().length >= 2;

  return (
    <div ref={box} className="relative">
      <label htmlFor="compare-search" className="mb-1.5 block text-sm font-bold text-foreground">
        Add a product to compare <span className="font-medium text-muted-foreground">({selected.length} of {MAX_COMPARE})</span>
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="compare-search"
          type="text"
          value={input}
          disabled={full}
          autoComplete="off"
          placeholder={full ? "Remove a product to add another" : "Search by product name, brand or category…"}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") return setOpen(false);
            if (!showList || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % results.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              pick(results[active]);
            }
          }}
          role="combobox"
          aria-expanded={showList}
          aria-controls="compare-results"
          aria-autocomplete="list"
          className="h-12 w-full rounded border-2 border-input bg-background pl-11 pr-11 text-sm font-medium text-foreground outline-none transition-all placeholder:font-normal placeholder:text-muted-foreground/80 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/20 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {loading ? (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />
        ) : (
          input && (
            <button type="button" onClick={clear} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )
        )}
      </div>

      {showList && (
        <ul id="compare-results" role="listbox" aria-label="Products to add" className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[22rem] overflow-y-auto rounded border border-border bg-popover shadow-xl" data-lenis-prevent>
          {results.length === 0 && !loading && <li className="px-4 py-4 text-sm text-muted-foreground">No products match “{input.trim()}”.</li>}
          {results.map((p, i) => {
            const added = selected.includes(p.slug);
            return (
              <li key={p.id} role="option" aria-selected={active === i}>
                <button
                  type="button"
                  disabled={added}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(p);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left transition-colors disabled:cursor-default ${active === i ? "border-brand-orange bg-accent" : "border-transparent hover:bg-secondary/60"} ${i ? "border-t border-t-border" : ""}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images.find((im) => im.isPrimary)?.url ?? p.images[0]?.url} alt="" className="h-11 w-11 shrink-0 rounded bg-secondary object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{p.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {p.categoryName} · <b className="text-accent-text">৳{p.price.toLocaleString("en-BD")}</b>
                    </span>
                  </span>
                  {added ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <Check className="h-4 w-4" aria-hidden="true" /> Added
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground">
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
