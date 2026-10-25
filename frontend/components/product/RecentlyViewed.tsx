"use client";

import { useRecentlyViewed } from "@/lib/hooks/use-recently-viewed";
import { ArrowUpRight, History, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const money = (n: number) => `৳${n.toLocaleString("en-BD")}`;

export default function RecentlyViewed({ currentProductId }: { currentProductId?: string }) {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();

  // the product being looked at right now isn't "recent"
  const items = recentlyViewed.filter((item) => item.id !== currentProductId);

  // needs at least two to be worth showing
  if (items.length < 2) return null;

  return (
    <section aria-labelledby="recently-viewed-heading">
      <div className="mb-6 flex items-end justify-between gap-2 sm:gap-4">
        <div>
          <h2 id="recently-viewed-heading" className="flex items-center gap-2 whitespace-nowrap font-outfit text-xl font-extrabold tracking-tight text-primary dark:text-foreground sm:gap-2.5 sm:text-3xl">
            <History className="h-5 w-5 shrink-0 text-brand-orange sm:h-6 sm:w-6" aria-hidden="true" />
            Recently viewed
          </h2>
          <span className="mt-3 block h-1 w-16 bg-brand-orange" aria-hidden="true" />
        </div>
        <button
          type="button"
          onClick={clearRecentlyViewed}
          className="inline-flex shrink-0 items-center gap-1.5 rounded border border-border bg-card px-2.5 py-2 text-xs font-semibold sm:px-3 text-muted-foreground transition-colors hover:border-brand-orange hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {items.map((item) => {
          const off = item.originalPrice && item.originalPrice > item.price ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100) : 0;
          return (
            <li key={item.id}>
              <Link
                href={`/products/${item.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-orange hover:shadow-[0_18px_34px_-16px_rgba(5,57,114,0.35)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    sizes="(max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-navy/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {off > 0 && <span className="absolute left-2.5 top-2.5 rounded bg-card px-2 py-1 text-[10px] font-bold leading-none text-destructive shadow-sm">-{off}%</span>}
                  <span className="absolute bottom-2.5 right-2.5 flex h-8 w-8 translate-y-2 items-center justify-center rounded bg-brand-orange text-on-orange opacity-0 shadow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{item.categoryName}</p>
                  <h3 className="line-clamp-2 min-h-[2.5rem] font-outfit text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary dark:group-hover:text-accent-text sm:text-[15px]">
                    {item.name}
                  </h3>
                  <p className="mt-auto flex items-baseline gap-2 pt-3">
                    <span className="font-outfit text-lg font-bold leading-none text-primary dark:text-foreground">{money(item.price)}</span>
                    {off > 0 && <span className="text-xs font-medium text-muted-foreground line-through">{money(item.originalPrice!)}</span>}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
