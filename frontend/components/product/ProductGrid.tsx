"use client";

import NoIndexWhenFiltered from "@/components/seo/NoIndexWhenFiltered";
import { errorMessage } from "@/lib/api/client";
import { listProducts, type ProductPage, type ProductQuery, type SortOption } from "@/lib/services/products.service";
import type { Brand, Category, Product } from "@/lib/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EmptyState from "./EmptyState";
import type { ActiveFilter } from "./FilterChips";
import FilterChips from "./FilterChips";
import type { FilterState } from "./FilterSidebar";
import FilterSidebar from "./FilterSidebar";
import ProductCard from "./ProductCard";
import SortBar from "./SortBar";

interface ProductGridProps {
  /** First page, fetched on the server */
  initial: ProductPage;
  categories: Category[];
  /** Brands that have products in this view (with counts) */
  brands: Brand[];
  /** price range of this view */
  priceRange: { min: number; max: number };
  /** If set, the category filter is locked to this slug (category page) */
  lockedCategory?: string;
  /** If set, the brand filter is locked to this slug (brand page) */
  lockedBrand?: string;
  /** sub-category slug inside a category page */
  subCategory?: string;
  /** search words (search page) */
  search?: string;
  /** options from the link that brought the visitor here */
  start?: { sortBy?: SortOption; onSale?: boolean; inStock?: boolean; category?: string; brand?: string; sub?: string };
}

const PAGE_SIZE = 24;

export default function ProductGrid({
  initial,
  categories,
  brands,
  priceRange,
  lockedCategory,
  lockedBrand,
  subCategory,
  search,
  start,
}: ProductGridProps) {
  const priceMin = Math.floor(priceRange.min);
  const priceMax = Math.ceil(priceRange.max);
  const base: FilterState = {
    categories: lockedCategory ? [lockedCategory] : start?.category ? [start.category] : [],
    subCategories: start?.sub ? [start.sub] : [],
    brands: lockedBrand ? [lockedBrand] : start?.brand ? [start.brand] : [],
    minPrice: priceMin,
    maxPrice: priceMax,
    inStockOnly: !!start?.inStock,
  };
  const [filters, setFilters] = useState<FilterState>(base);
  const [sortBy, setSortBy] = useState<SortOption>(start?.sortBy ?? "popular");
  const [onSale, setOnSale] = useState(!!start?.onSale);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>(initial.products);
  const [meta, setMeta] = useState(initial.meta);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef(true);
  const reqId = useRef(0);

  // slugs of the sub-categories that belong to a category
  const subsOf = useCallback(
    (catSlug: string) => {
      const owned = new Set(categories.find((c) => c.slug === catSlug)?.subCategories.map((x) => x.slug));
      return filters.subCategories.filter((x) => owned.has(x));
    },
    [categories, filters.subCategories],
  );

  const query = useMemo<ProductQuery>(
    () => ({
      search: search || undefined,
      category: lockedCategory ?? (filters.categories.length === 1 ? filters.categories[0] : undefined),
      subCategory:
        subCategory ??
        (filters.categories.length === 1 ? subsOf(filters.categories[0]).join(",") || undefined : filters.categories.length === 0 ? filters.subCategories.join(",") || undefined : undefined),
      brand: filters.brands.length ? filters.brands : undefined,
      minPrice: filters.minPrice > priceMin ? filters.minPrice : undefined,
      maxPrice: filters.maxPrice < priceMax ? filters.maxPrice : undefined,
      inStock: filters.inStockOnly || undefined,
      onSale: onSale || undefined,
      sortBy,
      limit: PAGE_SIZE,
    }),
    [filters, sortBy, onSale, search, lockedCategory, subCategory, priceMin, priceMax, subsOf],
  );

  // New filters / sort → fetch page 1 again
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        // several categories on a non-category page: fetch each and merge
        const cats = !lockedCategory && filters.categories.length > 1 ? filters.categories : [undefined];
        const pages = await Promise.all(cats.map((c) => listProducts({ ...query, category: c ?? query.category, ...(c ? { subCategory: subsOf(c).join(",") || undefined } : {}), page: 1 })));
        if (id !== reqId.current) return;
        const merged = cats.length > 1 ? sortLocal(dedupe(pages.flatMap((p) => p.products)), sortBy) : pages[0].products;
        setProducts(merged);
        setMeta(cats.length > 1 ? { ...pages[0].meta, total: merged.length, totalPages: 1, page: 1 } : pages[0].meta);
      } catch (e) {
        if (id === reqId.current) setError(errorMessage(e));
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [query, filters.categories, lockedCategory, sortBy, subsOf]);

  async function loadMore() {
    if (loadingMore) return;
    setError(null);
    setLoadingMore(true);
    try {
      const next = await listProducts({ ...query, page: meta.page + 1 });
      setProducts((prev) => dedupe([...prev, ...next.products]));
      setMeta(next.meta);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  // keep the observer pointed at the latest loadMore (it closes over the current page and filters)
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const canLoadMore = meta.page < meta.totalPages && !loading && !loadingMore && !error;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !canLoadMore) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMoreRef.current();
      },
      { rootMargin: "700px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [canLoadMore, products.length]);

  // Build active filter chips
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const chips: ActiveFilter[] = [];

    filters.categories
      .filter((slug) => !lockedCategory || slug !== lockedCategory)
      .forEach((slug) => {
        const cat = categories.find((c) => c.slug === slug);
        if (cat) chips.push({ key: `category:${slug}`, label: cat.name });
      });

    filters.subCategories.forEach((slug) => {
      const sub = categories.flatMap((c) => c.subCategories).find((x) => x.slug === slug);
      if (sub) chips.push({ key: `sub:${slug}`, label: sub.name });
    });

    filters.brands
      .filter((slug) => !lockedBrand || slug !== lockedBrand)
      .forEach((slug) => {
        const brand = brands.find((b) => b.slug === slug);
        if (brand) chips.push({ key: `brand:${slug}`, label: brand.name });
      });

    if (filters.inStockOnly) chips.push({ key: "inStock", label: "In Stock" });
    if (onSale) chips.push({ key: "onSale", label: "On Sale" });

    if (filters.minPrice > priceMin || filters.maxPrice < priceMax) {
      chips.push({
        key: "price",
        label: `৳${filters.minPrice.toLocaleString("en-BD")} – ৳${filters.maxPrice.toLocaleString("en-BD")}`,
      });
    }

    return chips;
  }, [filters, onSale, categories, brands, lockedCategory, lockedBrand, priceMin, priceMax]);

  const handleRemoveFilter = useCallback(
    (key: string) => {
      if (key.startsWith("category:")) {
        const slug = key.replace("category:", "");
        setFilters((prev) => {
          const owned = new Set(categories.find((c) => c.slug === slug)?.subCategories.map((x) => x.slug));
          return { ...prev, categories: prev.categories.filter((c) => c !== slug), subCategories: prev.subCategories.filter((x) => !owned.has(x)) };
        });
      } else if (key.startsWith("sub:")) {
        const slug = key.replace("sub:", "");
        setFilters((prev) => ({ ...prev, subCategories: prev.subCategories.filter((x) => x !== slug) }));
      } else if (key.startsWith("brand:")) {
        const slug = key.replace("brand:", "");
        setFilters((prev) => ({ ...prev, brands: prev.brands.filter((b) => b !== slug) }));
      } else if (key === "inStock") {
        setFilters((prev) => ({ ...prev, inStockOnly: false }));
      } else if (key === "onSale") {
        setOnSale(false);
      } else if (key === "price") {
        setFilters((prev) => ({ ...prev, minPrice: priceMin, maxPrice: priceMax }));
      }
    },
    [priceMin, priceMax, categories],
  );

  function handleClearAll() {
    setFilters({ ...base, inStockOnly: false });
    setOnSale(false);
  }

  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div className="flex items-start gap-6">
      {/* Inject noindex when filters are active to prevent crawling of filtered URLs */}
      <NoIndexWhenFiltered noIndex={hasActiveFilters} />

      {/* ── Sidebar ─────────────────────────────────── */}
      <FilterSidebar
        categories={categories}
        brands={brands}
        filters={filters}
        onFiltersChange={setFilters}
        priceMin={priceMin}
        priceMax={priceMax}
        activeCount={activeFilters.length}
        onReset={handleClearAll}
        mobileOpen={mobileFiltersOpen}
        onMobileClose={() => setMobileFiltersOpen(false)}
      />

      {/* ── Main content ────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Sort bar */}
        <SortBar
          resultCount={meta.total}
          sortBy={sortBy}
          onSortChange={setSortBy}
          inStockOnly={filters.inStockOnly}
          onInStockChange={(inStock) => setFilters((prev) => ({ ...prev, inStockOnly: inStock }))}
          onOpenFilters={() => setMobileFiltersOpen(true)}
          activeCount={activeFilters.length}
        />

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mb-4">
            <FilterChips
              filters={activeFilters}
              onRemove={handleRemoveFilter}
              onClearAll={handleClearAll}
            />
          </div>
        )}

        {/* Product grid */}
        {error && (
          <p role="alert" className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="transition-opacity duration-200" style={{ opacity: loading ? 0.45 : 1 }} aria-busy={loading}>
          {products.length === 0 && !loading ? (
            <EmptyState hasFilters={hasActiveFilters} onClearFilters={handleClearAll} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((product, idx) => (
                <ProductCard key={product.id} product={product} animationDelay={Math.min(idx * 40, 400)} />
              ))}
            </div>
          )}
        </div>

        {/* Infinite scroll: the next page loads as this marker nears the screen */}
        {meta.page < meta.totalPages && (
          <div ref={sentinel} className="mt-10 flex min-h-12 flex-col items-center justify-center gap-3">
            {error ? (
              <button
                type="button"
                onClick={loadMore}
                className="rounded border border-brand-orange/40 bg-brand-orange/10 px-8 py-3 text-xs font-black uppercase tracking-widest text-accent-text transition hover:bg-brand-orange hover:text-on-orange"
              >
                Couldn&apos;t load more — try again
              </button>
            ) : (
              <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground" role="status" aria-live="polite">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" aria-hidden="true" />
                Loading more products…
              </div>
            )}
          </div>
        )}
        {meta.page >= meta.totalPages && products.length > 12 && (
          <p className="mt-10 text-center text-sm font-medium text-muted-foreground">You&apos;ve seen all {meta.total} products</p>
        )}
      </div>
    </div>
  );
}

function dedupe(list: Product[]): Product[] {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

function sortLocal(list: Product[], sort: SortOption): Product[] {
  const l = [...list];
  if (sort === "price-asc") l.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") l.sort((a, b) => b.price - a.price);
  else if (sort === "newest") l.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  else l.sort((a, b) => b.soldLast24h - a.soldLast24h);
  return l;
}
