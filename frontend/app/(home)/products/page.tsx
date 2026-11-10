import ProductGrid from "@/components/product/ProductGrid";
import { ListingSkeleton } from "@/components/skeletons/PageSkeletons";
import SkeletonGrid from "@/components/product/SkeletonGrid";
import { getShopCategories } from "@/lib/services/categories.service";
import { getProductFacets, listProducts, type SortOption } from "@/lib/services/products.service";
import { facetBrands } from "@/lib/utils/facets";
import type { Metadata } from "next";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Collections — Fairu Fashion",
  description: "Browse premium women's dresses, ethnic wear, party gowns, kurtis and accessories at Fairu Fashion with prices in BDT and delivery across Bangladesh.",
};

const SORTS: SortOption[] = ["popular", "newest", "price-asc", "price-desc", "rating", "name"];

type Search = { sortBy?: string; onSale?: string; inStock?: string; category?: string; brand?: string; sub?: string };

// The outer page only reads the URL; the data-heavy part sits behind a Suspense boundary keyed by the
// filters, so choosing another category/brand shows the skeleton at once instead of keeping the old page.
export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  return (
    <Suspense key={JSON.stringify(sp)} fallback={<ListingSkeleton />}>
      <ProductsContent sp={sp} />
    </Suspense>
  );
}

async function ProductsContent({ sp }: { sp: Search }) {
  const sortBy = SORTS.includes(sp.sortBy as SortOption) ? (sp.sortBy as SortOption) : undefined;
  const start = { sortBy, onSale: sp.onSale === "true", inStock: sp.inStock === "true", category: sp.category || undefined, brand: sp.brand || undefined, sub: sp.sub || undefined };

  const [initial, categories, facets] = await Promise.all([
    listProducts({ sortBy: sortBy ?? "popular", onSale: start.onSale || undefined, inStock: start.inStock || undefined, category: start.category, subCategory: start.sub, brand: start.brand ? [start.brand] : undefined }),
    getShopCategories(),
    getProductFacets({ category: start.category }),
  ]);

  const catName = categories.find((c) => c.slug === start.category)?.name;
  const brandName = facets.brands.find((b) => b.slug === start.brand)?.name;
  const subName = categories.flatMap((c) => c.subCategories).find((x) => x.slug === start.sub)?.name;
  const heading = subName
    ? { lead: "", accent: subName }
    : brandName
    ? { lead: "", accent: brandName }
    : catName
      ? { lead: "", accent: catName }
      : { lead: "All", accent: "Products" };

  return (
    <div id="products-catalog-page" data-hide-footer="true" className="bg-background min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 pt-6 pb-20">
        <h1 className="mb-5 font-outfit text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
          {heading.lead} <span className="text-accent-text">{heading.accent}</span>
        </h1>
        <Suspense fallback={<SkeletonGrid count={12} />}>
          <ProductGrid key={`${start.category ?? ""}|${start.sub ?? ""}|${start.brand ?? ""}`} initial={initial} categories={categories} brands={facetBrands(facets)} priceRange={facets.price} start={start} />
        </Suspense>
      </div>
    </div>
  );
}
