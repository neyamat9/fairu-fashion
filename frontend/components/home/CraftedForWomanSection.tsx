"use client";

import { useQuickAdd } from "@/lib/hooks/use-quick-add";
import type {
  CraftedProductItem,
  CraftedSectionSettings,
} from "@/lib/services/site.service";
import { motion } from "framer-motion";
import { Loader2, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

interface CraftedForWomanSectionProps {
  settings?: CraftedSectionSettings;
}

const DEFAULT_ITEMS: CraftedProductItem[] = [
  {
    productId: "zamzam-casual",
    name: "Zamzam Royal Three Piece",
    slug: "three-piece",
    price: 3450,
    imageUrl: "/curated/curated-1.jpg",
    categoryTag: "CASUAL WEAR",
    bgGradient: "from-[#FDF2F4] via-[#F9E2E7] to-[#F1CAD4]",
  },
  {
    productId: "bin-hamid-luxe",
    name: "Bin Hamid Luxury Lawn",
    slug: "three-piece",
    price: 3950,
    imageUrl: "/curated/curated-2.jpg",
    categoryTag: "LUXURY LAWN",
    bgGradient: "from-[#FEF9EE] via-[#FDF0D5] to-[#F7E1B5]",
  },
  {
    productId: "festive-embroidered",
    name: "Summer Floral Festive",
    slug: "three-piece",
    price: 2850,
    imageUrl: "/curated/curated-3.jpg",
    categoryTag: "FESTIVE WEAR",
    bgGradient: "from-[#F0F8FD] via-[#DBEFFC] to-[#C3E4FA]",
  },
  {
    productId: "royal-silk",
    name: "Gul Ahmed Mint Silk",
    slug: "three-piece",
    price: 4200,
    imageUrl: "/curated/curated-4.jpg",
    categoryTag: "ROYAL SILK",
    bgGradient: "from-[#EFFCF6] via-[#D8F8EA] to-[#BAF2D8]",
  },
  {
    productId: "rose-organza",
    name: "Fairu Rose Organza Edit",
    slug: "three-piece",
    price: 4800,
    imageUrl: "/curated/curated-5.jpg",
    categoryTag: "EXCLUSIVE COUTURE",
    bgGradient: "from-[#FDF3F6] via-[#FBE2EB] to-[#F7CADB]",
  },
];

export const CraftedForWomanSection: React.FC<CraftedForWomanSectionProps> = ({
  settings,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(3); // 4th card active by default (matching reference)
  const [addingId, setAddingId] = useState<string | null>(null);
  const quickAdd = useQuickAdd();

  const items =
    settings?.items && settings.items.length > 0
      ? settings.items
      : DEFAULT_ITEMS;
  const sectionTitle = settings?.title || "Crafted for the Elegant Woman";
  const sectionSubtitle =
    settings?.subtitle ||
    "Essential silhouettes, rich hand-woven textures, and effortless luxury for every occasion.";

  const handleAddToCart = async (
    e: React.MouseEvent,
    item: CraftedProductItem,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (addingId) return;

    setAddingId(item.productId);
    try {
      await quickAdd({
        id: item.productId,
        slug: item.slug,
        name: item.name,
        price: item.price,
        stock: 99,
        imageUrl: item.imageUrl,
      });
    } finally {
      setAddingId(null);
    }
  };

  const getProductHref = (slug: string) => {
    if (!slug || slug === "three-piece")
      return "/category/three-piece-collection";
    if (slug.startsWith("/")) return slug;
    if (slug.includes("piece") || slug.includes("category")) {
      const clean = slug.replace(/^category\//, "");
      return `/category/${clean === "three-piece" ? "three-piece-collection" : clean}`;
    }
    return `/products/${slug}`;
  };

  return (
    <section className="w-full py-8 sm:py-16 px-2 min-[360px]:px-3 sm:px-6 lg:px-8 bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[1400px] mx-auto rounded-[4px] bg-[#F7F7F8] p-2.5 min-[360px]:p-3.5 sm:p-8 lg:p-12 border border-neutral-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.03)]"
      >
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-10 pb-4 sm:pb-6 border-b border-neutral-200/60 px-1 sm:px-0"
        >
          <div>
            <h2 className="font-outfit font-normal text-2xl sm:text-3xl lg:text-4xl tracking-tight text-neutral-900">
              {sectionTitle}
            </h2>
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.75,
                delay: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="h-[2px] w-12 bg-[#A25E70]/80 mt-2.5 rounded-full origin-left"
            />
          </div>

          <p className="text-xs sm:text-[13px] font-normal text-neutral-500 max-w-[420px] md:text-right leading-relaxed">
            {sectionSubtitle}
          </p>
        </motion.div>

        {/* 
          HORIZONTAL ACCORDION CARDS CONTAINER
          GPU-accelerated cubic-bezier expansion — 100% fluid, zero jitter / vibration!
        */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-3 xl:gap-4 h-auto lg:h-[500px] xl:h-[540px] w-full">
          {items.map((card, idx) => {
            const isHovered = hoveredIdx === idx;
            const href = getProductHref(card.slug);
            const isAdding = addingId === card.productId;

            return (
              <motion.div
                key={`${card.productId}-${idx}`}
                initial={{
                  opacity: 0,
                  y: 32,
                  scale: 0.93,
                  filter: "blur(8px)",
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{
                  duration: 0.85,
                  delay: 0.12 + idx * 0.09,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                className={`group flex flex-col justify-between min-h-[420px] sm:min-h-[460px] lg:min-h-0 transition-[flex] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] will-change-[flex] cursor-pointer ${
                  isHovered ? "lg:flex-[2.6]" : "lg:flex-1"
                }`}
              >
                {/* 1. IMAGE CONTAINER (Clean rounded card, NO overlays inside, fills tightly) */}
                <div
                  className={`relative w-full flex-1 rounded-[4px] overflow-hidden bg-gradient-to-b ${
                    card.bgGradient || "from-[#FDF2F4] to-[#F1CAD4]"
                  } transition-all duration-500 ${
                    isHovered
                      ? "shadow-[0_20px_45px_rgba(20,10,20,0.12)] ring-1 ring-neutral-900/10"
                      : "shadow-xs hover:opacity-95"
                  }`}
                >
                  <Link
                    href={href}
                    className="absolute inset-0 z-10"
                    aria-label={`View ${card.name}`}
                  />

                  {/* High fashion model wearing the dress, edge-to-edge */}
                  <Image
                    src={card.imageUrl}
                    alt={card.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 450px"
                    className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                    priority={idx < 2}
                  />
                </div>

                {/* 2. UNDER THE IMAGE */}
                <div className="relative mt-2.5 sm:mt-3.5 h-11 w-full overflow-hidden">
                  {/* DESKTOP ONLY: Collapsed state (when not hovered) */}
                  <div
                    className={`hidden lg:flex absolute inset-0 items-center transition-all duration-300 ease-out ${
                      isHovered
                        ? "opacity-0 pointer-events-none -translate-y-2 scale-95"
                        : "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                    }`}
                  >
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-[4px] bg-white border border-neutral-200/80 shadow-xs text-neutral-800 w-fit max-w-full hover:bg-neutral-50 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-[1px] bg-[#A37055] shrink-0" />
                      <span className="font-poppins text-xs font-medium text-neutral-800 truncate">
                        {card.name}
                      </span>
                    </div>
                  </div>

                  {/* MOBILE: Always visible with Name + Price + Cart button (no hover needed).
                      DESKTOP: Expands when hovered. */}
                  <div
                    className={`flex absolute inset-0 items-center transition-all duration-300 ease-out ${
                      isHovered
                        ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                        : "opacity-100 translate-y-0 scale-100 pointer-events-auto lg:opacity-0 lg:pointer-events-none lg:translate-y-2 lg:scale-95"
                    }`}
                  >
                    <div className="w-full flex items-center justify-between gap-2 p-1.5 pl-3 sm:pl-4 rounded-[4px] bg-white text-neutral-900 shadow-sm border border-neutral-200/90">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-1">
                        <span className="font-poppins text-xs sm:text-[13px] font-semibold text-neutral-900 truncate">
                          {card.name}
                        </span>
                        <span className="shrink-0 font-poppins text-xs sm:text-[13px] font-bold text-neutral-950">
                          ৳{card.price.toLocaleString("en-BD")}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(e, card)}
                        disabled={isAdding}
                        title="Add to Cart"
                        aria-label={`Add ${card.name} to cart`}
                        className="w-8 h-8 rounded-[4px] bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-900 flex items-center justify-center transition-all border border-neutral-200/80 shadow-xs cursor-pointer disabled:opacity-75 shrink-0"
                      >
                        {isAdding ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShoppingBag className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
};
