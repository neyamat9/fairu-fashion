"use client";

import { useQuickAdd } from "@/lib/hooks/use-quick-add";
import { useWishlist } from "@/lib/hooks/use-wishlist";
import type { Product } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { toast } from "sonner";

interface RelatedProductsCarouselProps {
  products: Product[];
  title?: string;
}

function formatBDT(price: number): string {
  return `৳${price.toLocaleString("en-BD")}`;
}

export default function RelatedProductsCarousel({
  products,
  title = "Related Products",
}: RelatedProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  function scrollLeft() {
    scrollRef.current?.scrollBy({ left: -320, behavior: "smooth" });
  }

  function scrollRight() {
    scrollRef.current?.scrollBy({ left: 320, behavior: "smooth" });
  }

  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-foreground text-2xl font-black uppercase tracking-tighter font-outfit">
            {title}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Scroll left"
            className="w-9 h-9 flex items-center justify-center rounded bg-muted border border-border text-muted-foreground/70 hover:text-foreground hover:border-border transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Scroll right"
            className="w-9 h-9 flex items-center justify-center rounded bg-muted border border-border text-muted-foreground/70 hover:text-foreground hover:border-border transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => (
          <RelatedProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

// ── Related Product Card ─────────────────────────────────────────────────────
function RelatedProductCard({ product }: { product: Product }) {
  const quickAdd = useQuickAdd();
  const { addToVault, removeFromVault, isInVault } = useWishlist();
  const inVault = isInVault(product.id);

  const primaryImage =
    product.images.find((img) => img.isPrimary) ?? product.images[0];

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    void quickAdd({ id: product.id, slug: product.slug, name: product.name, price: product.price, stock: product.stock, imageUrl: primaryImage?.url ?? "", hasVariants: product.hasVariants });
  }

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    if (inVault) {
      removeFromVault(product.id);
    } else {
      addToVault({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl:
          primaryImage?.url ??
          `https://picsum.photos/seed/${product.id}/400/400`,
        stock: product.stock,
      });
      toast.success(`${product.name} saved to The Vault`, { duration: 2000 });
    }
  }

  return (
    <article className="group flex-shrink-0 w-56 bg-muted border border-border rounded p-4 flex flex-col hover:border-brand-orange/20 hover:bg-muted card-hover transition-all duration-300 overflow-hidden">
      {/* Wishlist */}
      <button
        type="button"
        onClick={handleToggleWishlist}
        aria-label={
          inVault
            ? `Remove ${product.name} from wishlist`
            : `Add ${product.name} to wishlist`
        }
        className={`absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center rounded transition-all ${
          inVault
            ? "text-accent-text"
            : "text-muted-foreground/70 hover:text-accent-text"
        }`}
        style={{ position: "absolute" }}
      >
        <svg
          className={`w-4 h-4 ${inVault ? "animate-heartbeat" : ""}`}
          fill={inVault ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {/* Image */}
      <Link href={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true">
        <div className="relative h-36 flex items-center justify-center mb-4 overflow-hidden rounded bg-muted">
          <div className="absolute inset-0 bg-brand-orange/5 blur-2xl rounded opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt}
              width={140}
              height={140}
              className="object-contain w-32 h-32 group-hover:scale-110 transition-transform duration-700 relative z-10"
              sizes="140px"
            />
          ) : (
            <div className="w-24 h-24 rounded bg-muted border border-border flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="mt-auto flex flex-col">
        <p className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-widest mb-1">
          {product.categoryName}
        </p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="text-foreground font-black text-sm uppercase tracking-tighter mb-2 font-outfit group-hover:text-accent-text transition-colors leading-tight line-clamp-2">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <span className="text-foreground text-base font-black tracking-tighter">
              {formatBDT(product.price)}
            </span>
            {product.originalPrice && (
              <span className="block text-muted-foreground/70 text-[10px] line-through font-bold">
                {formatBDT(product.originalPrice)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            aria-label={`Add ${product.name} to cart`}
            className="w-8 h-8 rounded bg-muted border border-border flex items-center justify-center hover:bg-brand-orange hover:border-brand-orange transition-all group/btn active:scale-95"
          >
            <svg
              className="w-3.5 h-3.5 text-muted-foreground/70 group-hover/btn:text-foreground transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
