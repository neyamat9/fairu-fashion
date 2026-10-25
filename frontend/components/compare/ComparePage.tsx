"use client";

import CompareSearch from "@/components/compare/CompareSearch";
import { buildCompareSections } from "@/lib/compare-rows";
import { MAX_COMPARE } from "@/lib/context/CompareContext";
import { useCompare } from "@/lib/hooks/use-compare";
import { useQuickAdd } from "@/lib/hooks/use-quick-add";
import { getProductBySlug } from "@/lib/services/products.service";
import type { Product } from "@/lib/types";
import { Check, GitCompareArrows, Plus, ShoppingCart, Star, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const MIN_COMPARE = 2;
type Extra = Product & { avgRating?: number; reviewCount?: number };

/** One shared grid for every row: the row's label on its own line, then one equal column per product — so cards, strip and rows always line up and the whole comparison stays centred. */
/** The product columns sit together in the middle of the page (only they are centred; headings, search and the row labels stay at the left). */
const groupCls = "mx-auto w-full md:max-w-[calc(var(--n)*20.5rem)]";
const gridCls = "grid grid-cols-[repeat(var(--n),minmax(0,1fr))] gap-x-2 sm:gap-x-3 md:gap-x-4";

const parseSlugs = (raw: string | null) => [...new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, MAX_COMPARE);

function ColumnSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[19rem] rounded border border-border bg-card p-2 sm:p-3">
      <div className="aspect-square w-full animate-pulse rounded bg-secondary" />
      <div className="mt-3 h-3 w-4/5 animate-pulse rounded bg-secondary" />
      <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-secondary" />
      <div className="mt-3 h-8 w-full animate-pulse rounded bg-secondary" />
    </div>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3 w-3 ${i <= Math.round(value) ? "fill-brand-orange text-brand-orange" : "text-muted-foreground/40"}`} />
      ))}
    </span>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { compareList, replaceCompare } = useCompare();
  const quickAdd = useQuickAdd();

  const slugs = useMemo(() => parseSlugs(params.get("p")), [params]);
  const slugKey = slugs.join(",");
  const hasParam = params.get("p") !== null;

  // full product details by slug (the cards in search results only have the basics)
  const [cache, setCache] = useState<Record<string, Product | null>>({});
  const products = slugs.map((s) => cache[s]);
  const loadingAny = slugs.some((s) => cache[s] === undefined);
  const ready = products.filter((p): p is Product => !!p);

  const setUrl = (next: string[]) => router.replace(next.length ? `/compare?p=${next.join(",")}` : "/compare", { scroll: false });

  // opened as plain /compare while the browser remembers a list → use it
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || hasParam || compareList.length === 0) return;
    seeded.current = true;
    router.replace(`/compare?p=${compareList.map((p) => p.slug).join(",")}`, { scroll: false });
  }, [hasParam, compareList, router]);

  useEffect(() => {
    const missing = slugs.filter((s) => cache[s] === undefined);
    if (!missing.length) return;
    let alive = true;
    Promise.all(missing.map((s) => getProductBySlug(s).catch(() => null))).then((rows) => {
      if (!alive) return;
      setCache((c) => ({ ...c, ...Object.fromEntries(missing.map((s, i) => [s, rows[i]])) }));
    });
    return () => {
      alive = false;
    };
  }, [slugKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // a product that no longer exists is dropped from the address
  useEffect(() => {
    const gone = slugs.filter((s) => cache[s] === null);
    if (!gone.length) return;
    toast.info(gone.length === 1 ? "One product is no longer available and was removed." : "Some products are no longer available and were removed.");
    setUrl(slugs.filter((s) => cache[s] !== null));
  }, [cache, slugKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // keep the floating compare tray and the saved list in step with this page
  useEffect(() => {
    if (!hasParam || loadingAny) return;
    replaceCompare(ready);
  }, [slugKey, loadingAny]); // eslint-disable-line react-hooks/exhaustive-deps

  function add(p: Product) {
    if (slugs.length >= MAX_COMPARE) return void toast.warning(`You can compare up to ${MAX_COMPARE} products at once`);
    if (slugs.includes(p.slug)) return;
    setUrl([...slugs, p.slug]);
  }
  const remove = (slug: string) => setUrl(slugs.filter((s) => s !== slug));

  const [onlyDiffs, setOnlyDiffs] = useState(false);
  const sections = ready.length >= MIN_COMPARE ? buildCompareSections(ready) : []; // cheap: at most 3 products
  const visible = sections
    .map((s) => ({ ...s, rows: onlyDiffs ? s.rows.filter((r) => r.differs) : s.rows }))
    .filter((s) => s.rows.length > 0);

  // the thin sticky strip (photo + name) appears once the big product cards have scrolled out of view
  const headRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: "-120px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ready.length, loadingAny]);

  const diffToggle = (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
      <input type="checkbox" checked={onlyDiffs} onChange={(e) => setOnlyDiffs(e.target.checked)} className="peer sr-only" />
      <span className="flex h-5 w-5 items-center justify-center rounded border-2 border-input bg-background transition-colors peer-checked:border-brand-orange peer-checked:bg-brand-orange peer-focus-visible:ring-4 peer-focus-visible:ring-brand-orange/25" aria-hidden="true">
        {onlyDiffs && <Check className="h-3.5 w-3.5 text-on-orange" strokeWidth={3} />}
      </span>
      Show differences only
    </label>
  );

  const columns = Math.max(MIN_COMPARE, slugs.length);
  const style = { "--n": columns } as React.CSSProperties;
  const showGrid = slugs.length > 0;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1440px] px-3 py-6 sm:px-6 md:py-10 lg:px-8">
       <div style={style}>
        {/* heading */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-outfit text-3xl font-black leading-tight tracking-tight text-primary dark:text-foreground sm:text-4xl">
              Compare <span className="text-brand-orange">products</span>
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Pick 2 or 3 products and see them side by side.</p>
          </div>
          {slugs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setUrl([]);
                replaceCompare([]);
              }}
              className="inline-flex h-10 items-center gap-2 rounded border border-border bg-card px-3.5 text-sm font-bold text-foreground transition-colors hover:border-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Clear all
            </button>
          )}
        </div>

        <div className="mb-6 rounded border border-border bg-card p-3 sm:p-4">
          <CompareSearch selected={slugs} onAdd={add} />
        </div>

        {!showGrid ? (
          <div className="flex flex-col items-center rounded border border-border bg-card px-6 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded bg-primary/10 text-primary dark:text-brand-blue">
              <GitCompareArrows className="h-8 w-8" aria-hidden="true" />
            </span>
            <h2 className="mt-5 font-outfit text-xl font-black text-foreground">Nothing to compare yet</h2>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">Search for a product above, or tap the compare icon on any product, to start. You can compare up to {MAX_COMPARE}.</p>
            <Link href="/products" className="mt-6 inline-flex h-11 items-center rounded bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
              Browse products
            </Link>
          </div>
        ) : (
          <div>
            {/* product cards */}
            <div ref={headRef} className={`${gridCls} ${groupCls}`} role="row">
              {Array.from({ length: columns }).map((_, i) => {
                const slug = slugs[i];
                if (!slug) {
                  return (
                    <div key={`empty-${i}`} className="mx-auto flex min-h-[12rem] w-full max-w-[19rem] flex-col items-center justify-center rounded border-2 border-dashed border-border p-3 text-center text-muted-foreground">
                      <Plus className="h-6 w-6" aria-hidden="true" />
                      <p className="mt-2 text-xs font-semibold sm:text-sm">Add one more product to compare</p>
                    </div>
                  );
                }
                const p = cache[slug];
                if (!p) return <ColumnSkeleton key={slug} />;
                const x = p as Extra;
                const out = p.stock <= 0;
                return (
                  <article key={p.id} className="relative mx-auto flex w-full max-w-[19rem] flex-col rounded border border-border bg-card p-2 sm:p-3" role="columnheader">
                    <button type="button" onClick={() => remove(p.slug)} aria-label={`Remove ${p.name} from comparison`} className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded border border-border bg-card/95 text-muted-foreground shadow-sm transition-colors hover:border-destructive hover:text-destructive">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <Link href={`/products/${p.slug}`} className="relative block aspect-square w-full overflow-hidden rounded bg-secondary" aria-label={`View ${p.name}`}>
                      <Image src={p.images.find((im) => im.isPrimary)?.url ?? p.images[0]?.url} alt={p.name} fill sizes="(max-width: 768px) 33vw, 260px" className={`object-cover ${out ? "opacity-60 grayscale" : ""}`} />
                    </Link>
                    <p className="mt-2 truncate text-[10px] font-bold uppercase tracking-wide text-muted-foreground sm:text-xs">{p.brandName}</p>
                    <Link href={`/products/${p.slug}`} className="mt-0.5 line-clamp-3 text-xs font-bold leading-snug text-foreground transition-colors hover:text-accent-text sm:text-sm">
                      {p.name}
                    </Link>
                    {!!x.avgRating && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground sm:text-xs">
                        <Stars value={x.avgRating} /> <span>{x.avgRating.toFixed(1)}</span>
                      </p>
                    )}
                    <p className="mt-1.5 font-outfit text-base font-black text-foreground sm:text-lg">৳{p.price.toLocaleString("en-BD")}</p>
                    {p.originalPrice && <p className="-mt-0.5 text-[11px] text-muted-foreground line-through">৳{p.originalPrice.toLocaleString("en-BD")}</p>}
                    <div className="mt-auto pt-3">
                      <button
                        type="button"
                        disabled={out}
                        onClick={() => void quickAdd({ id: p.id, slug: p.slug, name: p.name, price: p.price, stock: p.stock, imageUrl: p.images[0]?.url ?? "", hasVariants: p.variants.length > 0 })}
                        className="inline-flex h-9 w-full items-center justify-center gap-1 rounded bg-primary px-1 text-[11px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:gap-1.5 sm:text-sm"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                        {out ? "Sold out" : "Add to cart"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* thin sticky strip: photo + name of every product, shown while the rows scroll */}
            <div
              className={`sticky z-30 overflow-hidden rounded-b border-b border-border bg-background/95 backdrop-blur transition-[top,max-height,opacity] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${stuck ? "max-h-20 opacity-100 shadow-sm" : "max-h-0 opacity-0"}`}
              style={{ top: "calc(var(--sticky-top, 8rem) - 16px)" }}
              aria-hidden={!stuck}
            >
              <div className={`${gridCls} ${groupCls} items-center py-2`}>
                {Array.from({ length: columns }).map((_, i) => {
                  const p = slugs[i] ? cache[slugs[i]] : null;
                  return p ? (
                    <Link key={p.id} href={`/products/${p.slug}`} tabIndex={stuck ? 0 : -1} className="mx-auto flex w-full min-w-0 max-w-[19rem] items-center gap-1.5 sm:gap-2">
                      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-secondary sm:h-10 sm:w-10">
                        <Image src={p.images.find((im) => im.isPrimary)?.url ?? p.images[0]?.url} alt="" fill sizes="40px" className="object-cover" />
                      </span>
                      <span className="line-clamp-2 min-w-0 text-[10px] font-bold leading-tight text-foreground sm:text-xs">{p.name}</span>
                    </Link>
                  ) : (
                    <div key={`s-${i}`} />
                  );
                })}
              </div>
            </div>

            {/* comparison rows */}
            {ready.length < MIN_COMPARE ? (
              !loadingAny && (
                <p role="status" className="mt-6 rounded border border-brand-orange/40 bg-brand-orange/10 px-4 py-3 text-sm font-medium text-foreground">
                  Add at least {MIN_COMPARE} products to see the comparison. Use the search above.
                </p>
              )
            ) : (
              <div role="table" aria-label="Product comparison" className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  {diffToggle}
                  <span className="text-xs text-muted-foreground">{ready.length} products</span>
                </div>

                {visible.length === 0 && <p className="rounded border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">These products have no differences in the details we hold.</p>}

                {visible.map((section) => (
                  <div key={section.title} role="rowgroup" className="mb-5 overflow-hidden rounded border border-border bg-card">
                    <h2 className="bg-primary px-3 py-2 text-xs font-black uppercase tracking-wider text-primary-foreground sm:px-4 sm:text-sm">{section.title}</h2>
                    {section.rows.map((row, ri) => (
                      <div key={row.key} role="row" className={`py-2.5 md:py-3 ${ri % 2 ? "bg-secondary/40" : ""} ${row.differs ? "" : "text-muted-foreground"}`}>
                        <div role="rowheader" className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground sm:px-4 md:text-xs">
                          {row.label}
                          {row.differs && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand-orange align-middle" title="These differ" aria-label="differs" />}
                        </div>
                        <div className={`${gridCls} ${groupCls} items-start`}>
                        {row.cells.map((c, ci) => (
                          <div key={ci} role="cell" className="min-w-0 break-words px-2 text-center text-xs leading-snug sm:px-3 sm:text-sm">
                            {c.lines ? (
                              <ul className="mx-auto inline-block list-inside list-disc space-y-0.5 text-left marker:text-brand-orange">
                                {c.lines.map((l, li) => (
                                  <li key={li}>{l}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className={c.best ? "font-black text-emerald-700 dark:text-emerald-300" : row.differs ? "font-semibold text-foreground" : ""}>{c.text}</span>
                            )}
                            {c.sub && <span className="block text-[11px] text-muted-foreground">{c.sub}</span>}
                            {c.best && <span className="mt-0.5 inline-block rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">Best</span>}
                          </div>
                        ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
       </div>
      </div>
    </section>
  );
}
