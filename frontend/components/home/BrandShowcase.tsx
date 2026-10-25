"use client";

import { BrowseTrigger } from "@/components/browse/BrowseModals";
import RevealGroup from "@/components/motion/RevealGroup";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/components/motion/gsap";
import ProductCard from "@/components/product/ProductCard";
import type { Brand, Product } from "@/lib/types";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SectionHeader from "./SectionHeader";
import SectionMore, { sectionMoreClass } from "./SectionMore";

interface BrandShowcaseProps {
  brands: Brand[];
  /** brand slug → that brand's products */
  productsByBrand: Record<string, Product[]>;
}

/** A horizontally scrollable row driven only by the visitor (arrows, swipe, drag, wheel/trackpad). */
function useScrollRow() {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ prev: false, next: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ prev: el.scrollLeft > 4, next: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);

    // ── click-and-drag with the mouse (touch already swipes natively) ──
    let startX = 0;
    let startLeft = 0;
    let moved = false;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        el.classList.add("is-dragging");
      }
      if (moved) el.scrollLeft = startLeft - dx;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      // releasing re-enables snapping, so the row settles on the nearest item
      el.classList.remove("is-dragging");
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      startX = e.clientX;
      startLeft = el.scrollLeft;
      moved = false;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };
    // a drag must not count as a click on the tile/card under the cursor
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    const noNativeDrag = (e: Event) => e.preventDefault();
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("click", onClickCapture, true);
    el.addEventListener("dragstart", noNativeDrag);
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("click", onClickCapture, true);
      el.removeEventListener("dragstart", noNativeDrag);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      ro.disconnect();
    };
  }, [update]);

  const page = useCallback((dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }, []);

  return { ref, ...edge, page, update };
}

function Arrow({ dir, disabled, onClick, label }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void; label: string }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded border border-border bg-card text-foreground shadow-lg transition-all hover:border-brand-orange hover:bg-brand-orange hover:text-on-orange active:scale-90 disabled:pointer-events-none disabled:opacity-0 ${
        dir === "prev" ? "-left-2 md:-left-4" : "-right-2 md:-right-4"
      }`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

const noScrollbar = "no-scrollbar drag-row";

export default function BrandShowcase({ brands, productsByBrand }: BrandShowcaseProps) {
  const list = useMemo(() => brands.filter((b) => (productsByBrand[b.slug]?.length ?? 0) > 0), [brands, productsByBrand]);
  // start on the brand with the most products so the panel is never empty
  const initial = useMemo(
    () => [...list].sort((a, b) => (productsByBrand[b.slug]?.length ?? 0) - (productsByBrand[a.slug]?.length ?? 0))[0]?.slug ?? "",
    [list, productsByBrand],
  );
  const [active, setActive] = useState(initial);
  // a logo that fails to load falls back to the brand name
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const brandRow = useScrollRow();
  const productRow = useScrollRow();
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  const current = list.find((b) => b.slug === active) ?? list[0];
  const products = useMemo(() => (current ? productsByBrand[current.slug] ?? [] : []), [current, productsByBrand]);

  // new brand: back to the first product, refresh arrows
  useEffect(() => {
    if (productRow.ref.current) productRow.ref.current.scrollLeft = 0;
    productRow.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // product cards rise in: on first view as the section scrolls in, afterwards whenever the brand changes
  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-brand-card]", panel.current);
      if (!cards.length) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const isFirst = first.current;
        first.current = false;
        gsap.fromTo(
          cards,
          { opacity: 0, y: 48, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.08,
            clearProps: "transform",
            ...(isFirst
              ? { scrollTrigger: { trigger: panel.current, start: "top 85%", end: "bottom top", toggleActions: "play reset play reset" } }
              : {}),
          },
        );
        if (isFirst) ScrollTrigger.refresh();
      });
      return () => mm.revert();
    },
    { scope: panel, dependencies: [active], revertOnUpdate: true },
  );

  if (list.length === 0 || !current) return null;

  return (
    <section className="overflow-x-clip bg-background pb-16 pt-[60px] sm:pt-[58px] md:pb-20 md:pt-[71px]" aria-labelledby="brands-heading">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <RevealGroup>
          <SectionHeader
            title={
              <span id="brands-heading">
                Shop by <span className="text-brand-orange">brand</span>
              </span>
            }
            description="Pick a brand you trust and browse everything we stock from them."
            action={
              <BrowseTrigger
                kind="brands"
                className="group inline-flex w-fit shrink-0 items-center gap-2 rounded border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text"
              >
                All brands
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </BrowseTrigger>
            }
          />
        </RevealGroup>

        <div className="rounded border border-border border-t-4 border-t-brand-orange bg-card p-3 sm:p-5">
          {/* ── brand slider ── */}
          <RevealGroup>
            <div className="relative">
              <Arrow dir="prev" label="Previous brands" disabled={!brandRow.prev} onClick={() => brandRow.page(-1)} />
              <Arrow dir="next" label="Next brands" disabled={!brandRow.next} onClick={() => brandRow.page(1)} />
              <div
                ref={brandRow.ref}
                role="tablist"
                aria-label="Brands"
                className={`flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 md:gap-4 ${noScrollbar}`}
              >
                {list.map((b) => {
                  const on = b.slug === current.slug;
                  return (
                    <button
                      key={b.slug}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      data-reveal="pop"
                      onClick={() => setActive(b.slug)}
                      className="group w-[104px] shrink-0 snap-start text-center sm:w-[132px]"
                    >
                      <span
                        className={`flex h-[72px] items-center justify-center rounded border-2 bg-[#fcfaf5] px-3 transition-all duration-300 sm:h-[88px] ${
                          on
                            ? "border-brand-orange shadow-[0_10px_24px_-12px_rgba(249,155,16,0.9)]"
                            : "border-border group-hover:border-brand-orange/60"
                        }`}
                      >
                        {b.logoUrl && !broken[b.slug] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={b.logoUrl} alt={`${b.name} logo`} className="max-h-8 max-w-full object-contain sm:max-h-10" loading="lazy" draggable={false} onError={() => setBroken((m) => ({ ...m, [b.slug]: true }))} />
                        ) : (
                          <span className="font-outfit text-lg font-black text-primary">{b.name}</span>
                        )}
                      </span>
                      <span
                        className={`mt-2 block truncate text-xs font-bold transition-colors sm:text-sm ${
                          on ? "text-primary dark:text-accent-text" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {b.name}
                      </span>
                      <span className={`mx-auto mt-1 block h-0.5 rounded bg-brand-orange transition-all duration-300 ${on ? "w-8" : "w-0"}`} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          </RevealGroup>

          {/* ── that brand's products ── */}
          <div ref={panel} className="mt-5 border-t border-border pt-5 sm:mt-6 sm:pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-outfit text-lg font-bold text-foreground sm:text-xl" aria-live="polite">
                {current.name}
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  {products.length} product{products.length === 1 ? "" : "s"}
                </span>
              </h3>
              <Link
                href={`/products?brand=${current.slug}`}
                className="group inline-flex shrink-0 items-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-brand-orange hover:text-on-orange"
              >
                See all
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>

            <div className="relative">
              <Arrow dir="prev" label="Previous products" disabled={!productRow.prev} onClick={() => productRow.page(-1)} />
              <Arrow dir="next" label="Next products" disabled={!productRow.next} onClick={() => productRow.page(1)} />
              <div
                ref={productRow.ref}
                className={`flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 ${noScrollbar}`}
              >
                {products.map((p) => (
                  <div
                    key={p.id}
                    data-brand-card
                    className="min-w-0 shrink-0 snap-start basis-full min-[480px]:basis-[calc(50%-8px)] sm:basis-[calc(33.333%-10.7px)] lg:basis-[calc(25%-12px)] xl:basis-[calc(20%-12.8px)]"
                  >
                    <ProductCard product={p} entrance={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <SectionMore>
          <BrowseTrigger kind="brands" className={sectionMoreClass}>
            All brands
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </BrowseTrigger>
        </SectionMore>
      </div>
    </section>
  );
}
