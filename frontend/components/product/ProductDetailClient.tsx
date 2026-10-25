"use client";

import ImageGallery from "@/components/product/ImageGallery";
import ProductSummary from "@/components/product/ProductSummary";
import ProductTabs, { type ReviewStats } from "@/components/product/ProductTabs";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import RelatedProductsCarousel from "@/components/product/RelatedProductsCarousel";
import RelatedSideList from "@/components/product/RelatedSideList";
import StickyATCBar from "@/components/product/StickyATCBar";
import RevealGroup from "@/components/motion/RevealGroup";
import { useRecentlyViewed } from "@/lib/hooks/use-recently-viewed";
import { getProductBySlug } from "@/lib/services/products.service";
import type { Product, ProductVariant, Question, Review } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
  reviews: Review[];
  reviewStats: ReviewStats;
  questions: Question[];
  paymentMethods?: string[];
}

const money = (n: number) => `৳${n.toLocaleString("en-BD")}`;

export default function ProductDetailClient({ product: initial, relatedProducts, reviews, reviewStats, questions, paymentMethods }: ProductDetailClientProps) {
  const { addToRecentlyViewed } = useRecentlyViewed();
  const atcButtonRef = useRef<HTMLButtonElement>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);

  // The page may come from a cache (instant!), so right after it opens we quietly ask the API for the live price and stock
  // and update those numbers if they moved. Fast and accurate.
  type Live = Pick<Product, "id" | "price" | "originalPrice" | "discount" | "stock" | "variants">;
  const [live, setLive] = useState<Live | null>(null);
  const product: Product = live && live.id === initial.id ? { ...initial, ...live } : initial;
  useEffect(() => {
    let alive = true;
    getProductBySlug(initial.slug)
      .then((p) => {
        if (!alive || !p) return;
        const moved = p.price !== initial.price || p.originalPrice !== initial.originalPrice || p.stock !== initial.stock || JSON.stringify(p.variants.map((v) => [v.id, v.price, v.stock])) !== JSON.stringify(initial.variants.map((v) => [v.id, v.price, v.stock]));
        if (moved) setLive({ id: p.id, price: p.price, originalPrice: p.originalPrice, discount: p.discount, stock: p.stock, variants: p.variants });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [initial]);
  const currentPrice = variant?.price ?? product.price;

  // Track this product as recently viewed
  useEffect(() => {
    addToRecentlyViewed(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function handleVariantChange(v: ProductVariant | null) {
    setVariant(v);
  }

  const extra = product as Product & { reviewCount?: number; warranty?: string };
  const save = product.originalPrice && product.originalPrice > product.price ? product.originalPrice - product.price : 0;
  const stockLabel = product.stock > 0 ? "In Stock" : "Out of Stock";
  const year = new Date().getFullYear();

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
          <RevealGroup className="flex flex-col gap-5">
            {/* ── Full-width product card ── */}
            <section data-reveal="up" className="rounded border border-border bg-card p-4 sm:p-6">
              <div className="grid gap-6 md:grid-cols-[minmax(0,460px)_minmax(0,1fr)] md:gap-8 lg:gap-12">
                <div className="relative min-w-0">
                  {save > 0 && (
                    <span className="absolute left-3 top-3 z-20 rounded bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white shadow">Save: {money(save)}</span>
                  )}
                  <ImageGallery product={product} />
                </div>
                <ProductSummary product={product} atcRef={atcButtonRef} onVariantChange={handleVariantChange} paymentMethods={paymentMethods} />
              </div>
            </section>

            {/* ── Details (stacked sections) beside the related-products list ── */}
            <div className="grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
              <aside
                className="no-scrollbar hidden lg:sticky lg:block lg:max-h-[calc(100vh-var(--sticky-top,8rem)-1rem)] lg:overflow-y-auto lg:transition-[top] lg:duration-[600ms] lg:ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ top: "var(--sticky-top, 8rem)" }}
                data-lenis-prevent
              >
                <RelatedSideList products={relatedProducts} />
              </aside>

              <div className="flex min-w-0 flex-col gap-5">
                <section data-reveal="up" className="rounded border border-border bg-card">
                  <ProductTabs product={product} reviews={reviews} reviewStats={reviewStats} questions={questions} />
                </section>

                <section data-reveal="up" className="rounded border border-border bg-card p-5 sm:p-6">
                  <h2 className="font-outfit text-base font-bold leading-snug text-foreground sm:text-lg">
                    What is the {product.name} Price in Bangladesh {year}?
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    The {product.brandName ? `${product.brandName} ` : ""}
                    {product.name} price in BD is <b className="text-foreground">{money(product.price)}</b>.{" "}
                    {extra.warranty ? `It comes with ${extra.warranty.replace(/ brand warranty$/i, "")} warranty. ` : ""}
                    Based on {extra.reviewCount ?? 0} {extra.reviewCount === 1 ? "review" : "reviews"}, Fairu Fashion offers this {product.categoryName.toLowerCase()} item at{" "}
                    {money(product.price)}
                    {save > 0 ? ` and its regular price is ${money(product.originalPrice!)}` : ""}, which is {stockLabel} now. Every item is 100% genuine, with delivery
                    across Bangladesh and cash on delivery available.
                  </p>
                </section>
              </div>

            </div>
          </RevealGroup>

          {/* On phones/tablets the related list sits below instead of beside */}
          {relatedProducts.length > 0 && (
            <div className="mt-10 lg:hidden">
              <RelatedProductsCarousel products={relatedProducts} title="Related Products" />
            </div>
          )}

          <div className="mt-12 pb-12 sm:pb-16">
            <RecentlyViewed currentProductId={product.id} />
          </div>
        </div>
      </div>

      <StickyATCBar product={product} currentPrice={currentPrice} variant={variant} atcButtonRef={atcButtonRef} />
    </>
  );
}
