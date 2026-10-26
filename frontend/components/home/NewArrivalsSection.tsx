"use client";

import React from "react";
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";
import { ArrowRight } from "lucide-react";
import RevealGroup from "@/components/motion/RevealGroup";

interface NewArrivalsSectionProps {
  products: Product[];
}

export default function NewArrivalsSection({ products }: NewArrivalsSectionProps) {
  const displayProducts = products.slice(0, 8);

  if (displayProducts.length === 0) return null;

  return (
    <section
      className="w-full py-14 sm:py-18 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden"
      aria-labelledby="new-arrivals-heading"
    >
      <RevealGroup className="max-w-[1400px] mx-auto">
        {/* Luxury Architectural Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 pb-6 border-b border-neutral-200/80">
          <div>
            <h2
              id="new-arrivals-heading"
              className="font-outfit font-light text-2xl sm:text-3xl lg:text-4xl tracking-tight text-neutral-900 uppercase"
            >
              NEW SEASON <span className="font-semibold text-neutral-950">ARRIVALS</span>
            </h2>
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.16em] font-medium text-neutral-400 mt-2">
              Fresh silhouettes • Handcrafted luxury • Seasonal palettes
            </p>
          </div>

          <Link
            href="/browse?sort=newest"
            className="group inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-900 hover:text-[#9E596B] transition-colors font-poppins self-start sm:self-end"
          >
            <span>Explore All New In</span>
            <span className="w-8 h-8 rounded-full bg-neutral-100 group-hover:bg-[#9E596B] group-hover:text-white flex items-center justify-center transition-colors">
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} entrance={false} />
          ))}
        </div>
      </RevealGroup>
    </section>
  );
}
