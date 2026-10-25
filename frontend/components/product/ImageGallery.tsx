"use client";

import { useWishlist } from "@/lib/hooks/use-wishlist";
import type { Product, ProductImage } from "@/lib/types";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ImageGalleryProps {
  product: Product;
}

export default function ImageGallery({ product }: ImageGalleryProps) {
  const { addToVault, removeFromVault, isInVault } = useWishlist();
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const inVault = isInVault(product.id);
  const images: ProductImage[] =
    product.images.length > 0
      ? product.images
      : [
          {
            id: "fallback",
            url: `https://picsum.photos/seed/${product.id}/800/800`,
            alt: product.name,
            isPrimary: true,
          },
        ];

  const primaryImage = images[activeIndex];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i + 1) % images.length);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxOpen, images.length]);

  function handleThumbnailClick(idx: number) {
    if (idx === activeIndex) return;
    setActiveIndex(idx);
  }

  function handleOpenLightbox() {
    setLightboxIndex(activeIndex);
    setLightboxOpen(true);
  }

  function handleToggleWishlist() {
    if (inVault) {
      removeFromVault(product.id);
      toast.info(`Removed from The Vault`);
    } else {
      const primaryImg =
        product.images.find((img) => img.isPrimary) ?? product.images[0];
      addToVault({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl:
          primaryImg?.url ??
          `https://picsum.photos/seed/${product.id}/400/400`,
        stock: product.stock,
      });
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 400);
      toast.success(`Added to The Vault`, { duration: 2000 });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Main Image ─────────────────────────────────── */}
      <div
        className="relative rounded overflow-hidden bg-muted border border-border aspect-square cursor-zoom-in group"
        onClick={handleOpenLightbox}
        role="button"
        tabIndex={0}
        aria-label="Open image lightbox"
        onKeyDown={(e) => e.key === "Enter" && handleOpenLightbox()}
      >
        {/* Scale-in entrance */}
        <div
          className="w-full h-full flex items-center justify-center p-8"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "scale(1)" : "scale(0.92)",
            transition: "opacity 400ms ease-out, transform 400ms ease-out",
          }}
        >
          {/* Every photo is stacked; changing photo cross-fades (and eases in from a slight zoom) instead of swapping */}
          {images.map((img, i) => (
            <Image
              key={img.id}
              src={img.url}
              alt={img.alt}
              fill
              className="object-contain p-8"
              style={{
                opacity: i === activeIndex ? 1 : 0,
                transform: i === activeIndex ? "scale(1)" : "scale(1.06)",
                transition: "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1), transform 900ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              aria-hidden={i !== activeIndex}
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={i === 0}
            />
          ))}
        </div>

        {/* Ambient glow */}
        <div className="absolute inset-0 bg-brand-orange/5 blur-3xl rounded opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Zoom hint */}
        <div className="sr-only">
          <div className="bg-brand-navy/60 backdrop-blur-sm text-muted-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded border border-border">
            Click to zoom
          </div>
        </div>

        {/* ── Floating Wishlist Button ──────────────────── */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleWishlist();
          }}
          aria-label={
            inVault
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          className={`absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded border transition-all ${
            inVault
              ? "bg-brand-orange/20 border-brand-orange/40 text-accent-text"
              : "bg-brand-navy/40 border-border text-muted-foreground/70 hover:text-accent-text hover:border-brand-orange/30 hover:bg-brand-orange/10"
          }`}
        >
          <svg
            className={`w-5 h-5 ${isAnimating ? "animate-heartbeat" : ""}`}
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

        {/* Product badges */}
        {product.badges.length > 0 && (
          <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none opacity-100 transition-opacity duration-200 group-hover:opacity-0">
            {product.badges.map((badge) => (
              <BadgeChip key={badge} badge={badge} />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnail Strip ────────────────────────────── */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => handleThumbnailClick(idx)}
              aria-label={`View image ${idx + 1}: ${img.alt}`}
              className={`relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all duration-200 ${
                idx === activeIndex
                  ? "border-brand-orange opacity-100"
                  : "border-border opacity-50 hover:opacity-80 hover:border-border"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* ── Lightbox ───────────────────────────────────── */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

// ── Badge Chip ──────────────────────────────────────────────────────────────
// Solid colours (same as the product cards): the badges sit on top of photos, so see-through tints are hard to read.
const BADGE_STYLES: Record<string, string> = {
  NEW: "bg-emerald-600 text-white border-emerald-700",
  HOT: "bg-brand-orange text-on-orange border-brand-orange",
  "BEST SELLER": "bg-brand-orange text-on-orange border-brand-orange",
  "LIMITED STOCK": "bg-destructive text-white border-destructive",
};

function BadgeChip({ badge }: { badge: string }) {
  return (
    <span
      className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border shadow-sm ${
        BADGE_STYLES[badge] ?? "bg-secondary text-muted-foreground border-border"
      }`}
    >
      {badge}
    </span>
  );
}

// ── Lightbox ────────────────────────────────────────────────────────────────
interface LightboxProps {
  images: ProductImage[];
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  onClose: () => void;
}

function Lightbox({
  images,
  currentIndex,
  onIndexChange,
  onClose,
}: LightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const goPrev = useCallback(
    () => onIndexChange((currentIndex - 1 + images.length) % images.length),
    [currentIndex, images.length, onIndexChange]
  );
  const goNext = useCallback(
    () => onIndexChange((currentIndex + 1) % images.length),
    [currentIndex, images.length, onIndexChange]
  );

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[2000] bg-brand-navy/95 backdrop-blur-xl flex items-center justify-center animate-scale-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close lightbox"
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Previous image"
          className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div className="relative w-full max-w-4xl max-h-[80vh] mx-16 aspect-square">
        <Image
          src={images[currentIndex].url}
          alt={images[currentIndex].alt}
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 90vw, 800px"
          priority
        />
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Next image"
          className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center rounded bg-secondary border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground/70 text-xs font-bold tracking-widest">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => onIndexChange(idx)}
              aria-label={`View image ${idx + 1}`}
              className={`w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                idx === currentIndex
                  ? "border-brand-orange opacity-100"
                  : "border-border opacity-40 hover:opacity-70"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                width={48}
                height={48}
                className="object-contain w-full h-full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
