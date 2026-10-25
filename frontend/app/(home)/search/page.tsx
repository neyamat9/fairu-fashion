import ProductGrid from "@/components/product/ProductGrid";
import SkeletonGrid from "@/components/product/SkeletonGrid";
import { getCategories } from "@/lib/services/categories.service";
import { getProductFacets, listProducts } from "@/lib/services/products.service";
import { facetBrands } from "@/lib/utils/facets";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  if (!query) {
    return {
      title: "Search — Fairu Fashion",
      description: "Search the Fairu Fashion dress and fashion catalog.",
    };
  }

  return {
    title: `Results for "${query}" — Fairu Fashion`,
    description: `Search results for "${query}" on Fairu Fashion.`,
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const categories = await getCategories();
  // "Try searching for" ideas come from the shop's own categories
  const suggestions = categories.slice(0, 6).map((c) => c.name);

  // Only search when there's a non-empty query
  const [initial, facets] = query
    ? await Promise.all([listProducts({ search: query, sortBy: "popular" }), getProductFacets({ search: query })])
    : [null, null];
  const results = initial?.products ?? [];
  const total = initial?.meta.total ?? 0;

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 pt-6 pb-20">


        {/* ── Page header ────────────────────────────── */}
        <div className="mb-8">
          <p className="text-accent-text text-[10px] font-black uppercase tracking-[0.3em] mb-2">
            {query ? "Search Results" : "Search"}
          </p>

          {query ? (
            <>
              <h1 className="text-foreground text-4xl md:text-5xl font-black tracking-tight font-outfit">
                Results for{" "}
                <span className="text-accent-text">&ldquo;{query}&rdquo;</span>
              </h1>
              <p className="text-muted-foreground/70 text-sm mt-2">
                {total === 0
                  ? "No products found"
                  : `${total} ${total === 1 ? "product" : "products"} found`}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-foreground text-4xl md:text-5xl font-black tracking-tight font-outfit">
                Search <span className="text-accent-text">Products</span>
              </h1>
              <p className="text-muted-foreground/70 text-sm mt-2">
                Use the search bar above to find products
              </p>
            </>
          )}
        </div>

        {/* ── No query state ─────────────────────────── */}
        {!query && (
          <NoQueryState suggestions={suggestions} />
        )}

        {/* ── No results state ───────────────────────── */}
        {query && results.length === 0 && (
          <NoResultsState query={query} suggestions={suggestions} />
        )}

        {/* ── Results grid ───────────────────────────── */}
        {query && results.length > 0 && (
          <Suspense fallback={<SkeletonGrid count={12} />}>
            <ProductGrid
              key={query}
              initial={initial!}
              categories={categories}
              brands={facetBrands(facets!)}
              priceRange={facets!.price}
              search={query}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────── */

function NoQueryState({ suggestions }: { suggestions: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      {/* Icon */}
      <div className="w-24 h-24 rounded bg-muted border border-border flex items-center justify-center mb-8">
        <svg
          className="w-10 h-10 text-muted-foreground/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      <h2 className="text-foreground text-2xl font-black uppercase tracking-tighter font-outfit mb-3">
        What are you looking for?
      </h2>
      <p className="text-muted-foreground/70 text-sm font-medium max-w-xs mb-10 leading-relaxed">
        Type a product name, brand, or category in the search bar above to get started.
      </p>

      {/* Suggested searches */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
          Popular searches
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="px-4 py-2 bg-muted border border-border rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:border-brand-orange/40 hover:bg-brand-orange/10 transition-all"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoResultsState({ query, suggestions }: { query: string; suggestions: string[] }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      {/* Icon */}
      <div className="w-24 h-24 rounded bg-muted border border-border flex items-center justify-center mb-8">
        <svg
          className="w-10 h-10 text-muted-foreground/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h2 className="text-foreground text-2xl font-black uppercase tracking-tighter font-outfit mb-3">
        No Results Found
      </h2>
      <p className="text-muted-foreground/70 text-sm font-medium max-w-sm mb-3 leading-relaxed">
        We couldn&apos;t find any products matching{" "}
        <span className="text-foreground/80 font-bold">&ldquo;{query}&rdquo;</span>.
      </p>
      <p className="text-muted-foreground/70 text-xs font-medium max-w-xs mb-10 leading-relaxed">
        Try checking your spelling, using fewer keywords, or browsing by category.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 mb-12">
        <Link
          href="/products"
          className="px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded hover:bg-primary/90 transition-colors active:scale-95"
        >
          Browse All Products
        </Link>
        <Link
          href="/"
          className="px-6 py-3 bg-muted border border-border text-foreground text-xs font-black uppercase tracking-widest rounded hover:bg-secondary transition-colors"
        >
          Go Home
        </Link>
      </div>

      {/* Suggested searches */}
      <div className="flex flex-col items-center gap-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
          Try searching for
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((term) => (
            <Link
              key={term}
              href={`/search?q=${encodeURIComponent(term)}`}
              className="px-4 py-2 bg-muted border border-border rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:border-brand-orange/40 hover:bg-brand-orange/10 transition-all"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
