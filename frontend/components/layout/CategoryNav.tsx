"use client";

import type { Category } from "@/lib/types";
import { useBrowse } from "@/components/browse/BrowseModals";
import { gsap } from "@/components/motion/gsap";
import { useCart } from "@/lib/hooks/use-cart";
import { ChevronDown, LayoutGrid, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface CategoryNavProps {
  categories: Category[];
  /** True while the full header is tucked away: the cart button slides into this bar */
  compact?: boolean;
}

const linkClass =
  "relative inline-flex items-center gap-1 whitespace-nowrap px-3 py-3.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground after:absolute after:bottom-1.5 after:left-3 after:right-3 after:h-[2px] after:origin-left after:scale-x-0 after:bg-brand-orange after:transition-transform hover:after:scale-x-100";

function MiniCart() {
  const { cartCount, openCart } = useCart();
  const btn = useRef<HTMLButtonElement>(null);

  // slides in from the right with a springy pop
  useEffect(() => {
    const el = btn.current;
    if (!el) return;
    const t = gsap.fromTo(
      el,
      { x: 46, opacity: 0, scale: 0.4, rotate: 18 },
      { x: 0, opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: "back.out(2)" },
    );
    return () => {
      t.kill();
    };
  }, []);

  return (
    <button
      ref={btn}
      type="button"
      onClick={openCart}
      aria-label={`Open cart, ${cartCount} items`}
      className="relative ml-3 flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground shadow-md transition-colors hover:bg-brand-orange hover:text-on-orange"
    >
      <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
      {cartCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded bg-brand-orange px-1 text-[10px] font-bold text-on-orange">
          {cartCount > 9 ? "9+" : cartCount}
        </span>
      )}
    </button>
  );
}

export default function CategoryNav({ categories, compact = false }: CategoryNavProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { open: openBrowse } = useBrowse();

  // Only the categories that really fit are shown; the rest live in the "All categories" drawer.
  // Every link stays in the flow at its natural width; the ones that end past the right edge are hidden (and un-focusable).
  const row = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(categories.length);
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () => {
      const room = el.clientWidth;
      if (room === 0) return; // below the xl breakpoint the row is not displayed
      const kids = Array.from(el.children) as HTMLElement[];
      let n = 0;
      for (const k of kids) {
        if (k.offsetLeft + k.offsetWidth <= room + 0.5) n++;
        else break;
      }
      setFit((prev) => (prev === n ? prev : n));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [categories]);

  return (
    <nav className="relative z-[1000] overflow-x-clip border-b border-border bg-card/95 shadow-sm backdrop-blur-xl" aria-label="Product categories">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="flex items-center justify-between">
          {/* All categories: opens the floating sidebar (the same button on every screen size) */}
          <div className="flex items-center py-1.5">
            <button
              type="button"
              id="all-categories-toggle"
              onClick={() => openBrowse("categories")}
              aria-haspopup="dialog"
              className="mr-1 flex shrink-0 items-center gap-2 whitespace-nowrap rounded bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
              All categories
            </button>
            <Link href="/products" className={`${linkClass} hidden xl:inline-flex`}>
              All products
            </Link>
          </div>

          {/* Desktop nav */}
          <div ref={row} data-cat-row="" className="relative mx-2 hidden min-w-0 flex-1 items-center xl:flex">
            {categories.map((cat, i) => (
              <div
                key={cat.slug}
                className={`relative shrink-0 ${i >= fit ? "invisible" : ""}`}
                inert={i >= fit}
                onMouseEnter={() => setOpenMenu(cat.slug)}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <Link href={`/category/${cat.slug}`} prefetch className={linkClass}>
                  {cat.name.split(" & ")[0]}
                  {cat.subCategories.length > 0 && (
                    <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
                  )}
                </Link>

                {openMenu === cat.slug && cat.subCategories.length > 0 && (
                  <div className="absolute left-0 top-full z-[1000] min-w-[240px] pt-1">
                    <div className="rounded border border-border bg-popover p-2 shadow-xl">
                      {cat.subCategories.map((sub) => (
                        <Link
                          key={sub.slug}
                          href={`/products?category=${cat.slug}&sub=${sub.slug}`}
                          className="flex items-center rounded px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {sub.name}
                        </Link>
                      ))}
                      <Link
                        href={`/category/${cat.slug}`}
                        className="mt-1 flex items-center justify-center rounded bg-secondary px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-accent dark:text-accent-text"
                      >
                        View all {cat.name}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right side: promo + (when the header is tucked away) the cart */}
          <div className="flex items-center py-1.5">
            <Link
              href="/products"
              className="hidden items-center whitespace-nowrap rounded border border-brand-orange/40 bg-brand-orange/10 px-3 py-1.5 text-xs font-bold text-accent-text transition-colors hover:bg-brand-orange hover:text-on-orange 2xl:flex"
            >
              Today&apos;s deals
            </Link>
            {compact && <MiniCart />}
          </div>
        </div>

      </div>
    </nav>
  );
}
