import ProductGrid from "@/components/product/ProductGrid";
import { ListingSkeleton } from "@/components/skeletons/PageSkeletons";
import SkeletonGrid from "@/components/product/SkeletonGrid";
import { getCategories } from "@/lib/services/categories.service";
import { getProductFacets, listProducts } from "@/lib/services/products.service";
import { facetBrands } from "@/lib/utils/facets";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sub?: string }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    return { title: "Category Not Found — Fairu Fashion" };
  }

  return {
    title: `${category.name} — Fairu Fashion`,
    description: `Shop ${category.name} at Fairu Fashion. ${category.description}`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { sub } = await searchParams;
  return (
    <Suspense key={`${slug}|${sub ?? ""}`} fallback={<ListingSkeleton />}>
      <CategoryContent slug={slug} sub={sub} />
    </Suspense>
  );
}

async function CategoryContent({ slug, sub }: { slug: string; sub?: string }) {

  const categories = await getCategories();

  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    notFound();
  }

  const subSlug = category.subCategories.find((c) => c.slug === sub)?.slug;
  const [initial, facets] = await Promise.all([
    listProducts({ category: slug, subCategory: subSlug, sortBy: "popular" }),
    getProductFacets({ category: slug, subCategory: subSlug }),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 pt-6 pb-20">

        {/* Page header */}
        <div className="mb-5">
          <h1 className="font-outfit text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{category.name}</h1>
          {category.description && <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">{category.description}</p>}
        </div>

        {/* Subcategory quick-links */}
        {category.subCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            <Link
              href={`/category/${slug}`}
              scroll={false}
              className={`px-3 py-1.5 border rounded text-[11px] font-bold transition-all ${!subSlug ? "bg-brand-orange border-brand-orange text-foreground" : "bg-muted border-border text-muted-foreground hover:border-brand-orange hover:bg-accent hover:text-foreground dark:hover:bg-secondary dark:hover:text-white"}`}
            >
              All
            </Link>
            {category.subCategories.map((s) => (
              <Link
                key={s.slug}
                href={`/category/${slug}?sub=${s.slug}`}
                scroll={false}
                className={`px-3 py-1.5 border rounded text-[11px] font-bold transition-all ${subSlug === s.slug ? "bg-brand-orange border-brand-orange text-foreground" : "bg-muted border-border text-muted-foreground hover:border-brand-orange hover:bg-accent hover:text-foreground dark:hover:bg-secondary dark:hover:text-white"}`}
              >
                {s.name}
              </Link>
            ))}
          </div>
        )}

        {/* Grid with filters — category is locked */}
        <Suspense fallback={<SkeletonGrid count={12} />}>
          <ProductGrid
            key={subSlug ?? "all"}
            initial={initial}
            categories={categories}
            brands={facetBrands(facets)}
            priceRange={facets.price}
            lockedCategory={slug}
            subCategory={subSlug}
          />
        </Suspense>
      </div>
    </div>
  );
}
