import RevealGroup from "@/components/motion/RevealGroup";
import type { Category } from "@/lib/types";
import { BrowseTrigger } from "@/components/browse/BrowseModals";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import SectionHeader from "./SectionHeader";
import SectionMore, { sectionMoreClass } from "./SectionMore";

interface CategoryGridProps {
  categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="relative overflow-hidden bg-secondary pb-16 pt-[60px] sm:pt-[58px] md:pb-20 md:pt-[71px]" aria-labelledby="categories-heading">
      {/* decorative pixels that drift while scrolling */}
      <RevealGroup className="relative mx-auto max-w-[1440px] px-4 md:px-8">
        <span data-drift="1" className="pointer-events-none absolute -right-2 top-4 hidden h-6 w-6 bg-brand-orange/70 md:block" aria-hidden="true" />
        <span data-drift="1.8" className="pointer-events-none absolute right-24 top-24 hidden h-3 w-3 bg-brand-orange/40 md:block" aria-hidden="true" />
        <span data-drift="0.6" className="pointer-events-none absolute right-48 top-2 hidden h-4 w-4 bg-primary/30 md:block" aria-hidden="true" />

        <SectionHeader
          once
          title={
            <span id="categories-heading">
              Curated <span className="text-brand-orange">Collections</span> for Her
            </span>
          }
          description="From festive sarees and regal lehengas to chic western dresses and casual wear — find your signature style."
          action={
            <BrowseTrigger
              kind="categories"
              className="group inline-flex w-fit shrink-0 items-center gap-2 rounded border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text"
            >
              All categories
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </BrowseTrigger>
          }
        />

        <div className="grid grid-cols-2 gap-3 [perspective:1100px] md:gap-4 lg:grid-cols-4">
          {categories.map((cat) => {
            // The dashboard can attach an image to a category; fall back to its icon.
            const image = (cat as Category & { image?: string | null }).image;
            return (
              <Link
                data-reveal="clip"
                data-tilt
                key={cat.slug}
                href={`/category/${cat.slug}`}
                prefetch
                id={`category-${cat.slug}`}
                className="group relative aspect-[5/4] overflow-hidden rounded border border-border bg-gradient-to-br from-primary to-brand-navy-light will-change-transform"
              >
                {image ? (
                  <div data-parallax className="absolute inset-x-0 -inset-y-[9%]">
                    <div data-zoom className="relative h-full w-full">
                      <Image
                        src={image}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                  </div>
                ) : (
                  <svg
                    className="absolute left-1/2 top-[40%] h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/90 transition-transform duration-500 group-hover:scale-110"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.4}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                  </svg>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-brand-orange transition-transform duration-500 group-hover:scale-x-100" />

                <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded bg-brand-orange text-on-orange opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>

                <div className="absolute inset-x-0 bottom-0 p-3.5 md:p-4">
                  <h3 className="line-clamp-2 break-words font-outfit text-sm font-bold leading-tight text-white min-[400px]:text-base md:text-lg">{cat.name}</h3>
                  <p className="mt-0.5 text-xs font-medium text-white/80">{cat.productCount} products</p>
                </div>
              </Link>
            );
          })}
        </div>

        <SectionMore>
          <BrowseTrigger kind="categories" className={sectionMoreClass}>
            All categories
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </BrowseTrigger>
        </SectionMore>
      </RevealGroup>
    </section>
  );
}
