"use client";

import { useCompare } from "@/lib/hooks/use-compare";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Fixed bottom floating bar that appears when at least 1 product is in the compare list.
 * Shows up to 3 product thumbnails + names, a × remove button per product,
 * and a "Compare Now" CTA.
 */
export default function CompareBar() {
  const { compareList, removeFromCompare, clearCompare } = useCompare();
  const pathname = usePathname();

  // the compare page itself is the comparison, so the tray steps aside there
  const isVisible = compareList.length >= 1 && pathname !== "/compare";

  return (
    <div
      role="region"
      aria-label="Product comparison tray"
      aria-live="polite"
      className={[
        "fixed bottom-0 left-0 right-0 z-40",
        "transition-transform duration-300 ease-out",
        isVisible ? "translate-y-0" : "translate-y-full",
      ].join(" ")}
    >
      {/* Glassmorphism bar */}
      <div className="mx-auto max-w-5xl mb-4 px-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded bg-background/95 backdrop-blur-md border border-border shadow-2xl shadow-brand-navy/60">

          {/* Label */}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap hidden sm:block">
            Compare
          </span>

          {/* Product slots */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto min-w-0">
            {compareList.map((product) => {
              const primaryImage =
                product.images.find((img) => img.isPrimary) ?? product.images[0];
              return (
                <div
                  key={product.id}
                  className="flex items-center gap-2 bg-secondary rounded px-2 py-1.5 flex-shrink-0 animate-scale-in"
                >
                  {/* Thumbnail */}
                  <div className="relative w-9 h-9 rounded overflow-hidden bg-secondary flex-shrink-0">
                    {primaryImage ? (
                      <Image
                        src={primaryImage.url}
                        alt={product.name}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-secondary" />
                    )}
                  </div>

                  {/* Name */}
                  <span className="text-xs text-foreground font-medium max-w-[100px] truncate">
                    {product.name}
                  </span>

                  {/* Remove button */}
                  <button
                    onClick={() => removeFromCompare(product.id)}
                    aria-label={`Remove ${product.name} from comparison`}
                    className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground/70 hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0 text-xs leading-none"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            {/* Empty slots (visual placeholders up to 3) */}
            {Array.from({ length: Math.max(0, 3 - compareList.length) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center w-9 h-9 rounded border border-dashed border-border flex-shrink-0"
                  aria-hidden="true"
                >
                  <span className="text-muted-foreground/70 text-lg leading-none">+</span>
                </div>
              )
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Clear all */}
            <button
              onClick={clearCompare}
              aria-label="Clear all products from comparison"
              className="text-xs text-muted-foreground/70 hover:text-foreground/80 transition-colors whitespace-nowrap hidden sm:block"
            >
              Clear all
            </button>

            {/* Compare Now CTA — only active when ≥ 2 products */}
            {compareList.length >= 2 ? (
              <Link
                href={`/compare?p=${compareList.map((p) => p.slug).join(",")}`}
                className="px-4 py-2 rounded bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
              >
                Compare Now
              </Link>
            ) : (
              <button
                disabled
                aria-label="Add at least 2 products to compare"
                className="px-4 py-2 rounded bg-secondary text-muted-foreground/70 text-sm font-semibold cursor-not-allowed whitespace-nowrap"
              >
                Compare Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
