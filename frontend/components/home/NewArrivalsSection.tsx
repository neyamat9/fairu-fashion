"use client";

import React from "react";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";
import RevealGroup from "@/components/motion/RevealGroup";
import SectionHeader from "./SectionHeader";
import SectionMore from "./SectionMore";

interface NewArrivalsSectionProps {
  products: Product[];
}

export default function NewArrivalsSection({ products }: NewArrivalsSectionProps) {
  const displayProducts = products.slice(0, 8);

  if (displayProducts.length === 0) return null;

  return (
    <section
      className="overflow-x-clip bg-background pb-16 pt-[60px] sm:pt-[58px] md:pb-20 md:pt-[71px]"
      aria-labelledby="new-arrivals-heading"
    >
      <RevealGroup className="relative mx-auto max-w-[1440px] px-4 md:px-8">
        <span
          data-drift="1.4"
          className="pointer-events-none absolute right-0 top-2 hidden h-5 w-5 bg-brand-orange/60 md:block"
          aria-hidden="true"
        />
        <span
          data-drift="0.7"
          className="pointer-events-none absolute right-16 top-20 hidden h-3 w-3 bg-primary/30 md:block"
          aria-hidden="true"
        />

        <SectionHeader
          title={
            <span id="new-arrivals-heading">
              New <span className="text-brand-orange">Arrivals</span>
            </span>
          }
          description="Fresh designs and seasonal collections just arrived in our boutique."
          href="/products"
          hrefLabel="View all products"
        />

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 gap-4 [perspective:1100px] min-[480px]:grid-cols-2 min-[480px]:gap-3 md:gap-5 lg:grid-cols-4">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} entrance={false} />
          ))}
        </div>

        <SectionMore href="/products" label="View all products" />
      </RevealGroup>
    </section>
  );
}
