import ProductGrid from "@/components/product/ProductGrid";
import SkeletonGrid from "@/components/product/SkeletonGrid";
import { getBrandBySlug } from "@/lib/services/brands.service";
import { getCategories } from "@/lib/services/categories.service";
import { getProductFacets, listProducts } from "@/lib/services/products.service";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export const revalidate = 300;

// no pages are built ahead of time; each one is built on its first visit and then kept (and refreshed every 5 minutes)
export function generateStaticParams() {
  return [];
}

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);

  if (!brand) {
    return { title: "Brand Not Found — Fairu Fashion" };
  }

  return {
    title: `${brand.name} — Fairu Fashion`,
    description: `Shop ${brand.name} products at Fairu Fashion. ${brand.description}`,
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;

  const brand = await getBrandBySlug(slug);

  if (!brand) {
    notFound();
  }

  const [initial, categories, facets] = await Promise.all([
    listProducts({ brand: [slug], sortBy: "popular" }),
    getCategories(),
    getProductFacets(),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 pt-6 pb-20">

        {/* Brand header */}
        <div className="mb-8">
          {/* Glassmorphism banner */}
          <div className="relative rounded overflow-hidden border border-border bg-muted backdrop-blur-sm p-8 mb-6">
            {/* Decorative accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-orange/60 to-transparent" />

            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex-1">
                <p className="text-accent-text text-[10px] font-black uppercase tracking-[0.3em] mb-2">
                  Brand
                </p>
                <h1 className="text-foreground text-4xl md:text-5xl font-black tracking-tight font-outfit">
                  {brand.name}
                </h1>
                {brand.description && (
                  <p className="text-muted-foreground/70 text-sm mt-3 max-w-xl leading-relaxed">
                    {brand.description}
                  </p>
                )}
              </div>

              {/* Brand metadata */}
              <div className="flex flex-wrap gap-3 md:flex-col md:items-end md:gap-2 shrink-0">
                {brand.country && (
                  <div className="flex items-center gap-1.5 text-muted-foreground/70 text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-accent-text/60">◈</span>
                    <span>{brand.country}</span>
                  </div>
                )}
                {brand.foundedYear && (
                  <div className="flex items-center gap-1.5 text-muted-foreground/70 text-[11px] font-bold uppercase tracking-wider">
                    <span className="text-accent-text/60">◈</span>
                    <span>Est. {brand.foundedYear}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground/70 text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-accent-text/60">◈</span>
                  <span>{initial.meta.total} products</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid with filters — brand is locked */}
        <Suspense fallback={<SkeletonGrid count={12} />}>
          <ProductGrid
            initial={initial}
            categories={categories}
            brands={[brand]}
            priceRange={facets.price}
            lockedBrand={slug}
          />
        </Suspense>
      </div>
    </div>
  );
}
