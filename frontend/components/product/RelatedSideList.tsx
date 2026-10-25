import type { Product } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

const money = (n: number) => `৳${n.toLocaleString("en-BD")}`;

/** Vertical "Related Products" list for the product page's left column. */
export default function RelatedSideList({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="related-side-heading" className="overflow-hidden rounded border border-border bg-card">
      <h2 id="related-side-heading" className="border-b border-border px-5 py-4 font-outfit text-base font-bold text-foreground">
        Related Products
      </h2>
      <ul className="divide-y divide-border/70">
        {products.map((p) => {
          const img = p.images.find((i) => i.isPrimary) ?? p.images[0];
          const save = p.originalPrice && p.originalPrice > p.price ? p.originalPrice - p.price : 0;
          return (
            <li key={p.id}>
              <Link href={`/products/${p.slug}`} className="group flex gap-3.5 px-5 py-4 transition-colors hover:bg-secondary/60">
                <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                  {img && <Image src={img.url} alt="" fill sizes="64px" className="object-cover transition-transform duration-500 group-hover:scale-110" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-accent-text">{p.name}</span>
                  <span className="mt-1 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-outfit text-base font-extrabold text-destructive">{money(p.price)}</span>
                    {save > 0 && <span className="text-xs text-muted-foreground line-through">{money(p.originalPrice!)}</span>}
                  </span>
                  {save > 0 && <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Save: {money(save)}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
