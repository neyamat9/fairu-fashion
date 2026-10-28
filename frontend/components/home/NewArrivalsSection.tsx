"use client";

import React from "react";
import ProductCard from "@/components/product/ProductCard";
import type { Product } from "@/lib/types";
import { motion } from "framer-motion";
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
      <div className="relative mx-auto max-w-[1440px] px-4 md:px-8">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="pointer-events-none absolute right-0 top-2 hidden h-5 w-5 bg-brand-orange/60 md:block"
          aria-hidden="true"
        />
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="pointer-events-none absolute right-16 top-20 hidden h-3 w-3 bg-primary/30 md:block"
          aria-hidden="true"
        />

        <SectionHeader
          useMotion
          title={
            <span id="new-arrivals-heading">
              New <span className="text-brand-orange">Arrivals</span>
            </span>
          }
          description="Fresh designs and seasonal collections just arrived in our boutique."
          href="/products"
          hrefLabel="View all products"
        />

        {/* Product Cards Grid with smooth editorial iris bloom and soft elevation */}
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-3 md:gap-5 lg:grid-cols-4">
          {displayProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{
                opacity: 0,
                y: 32,
                scale: 0.95,
                filter: "blur(4px)",
              }}
              whileInView={{
                opacity: 1,
                y: 0,
                scale: 1,
                filter: "blur(0px)",
              }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{
                duration: 0.7,
                delay: (idx % 4) * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="h-full"
            >
              <ProductCard product={product} entrance={false} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <SectionMore href="/products" label="View all products" />
        </motion.div>
      </div>
    </section>
  );
}
