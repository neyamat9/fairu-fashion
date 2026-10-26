"use client";

import React from "react";
import Image from "next/image";
import { ShowcaseProduct } from "@/lib/showcaseProducts";

interface ProductListProps {
  products: ShowcaseProduct[];
  currentIndex: number;
  onSelectProduct: (index: number) => void;
  isAnimating?: boolean;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  currentIndex,
  onSelectProduct,
  isAnimating = false,
}) => {
  const n = products.length;
  // 3 visible items: current, next1, next2
  const visibleIndices = [
    currentIndex % n,
    (currentIndex + 1) % n,
    (currentIndex + 2) % n,
  ];

  return (
    <div className="flex flex-col justify-center h-full max-w-[420px] select-none z-20">
      {/* Category Subtitle & Heading */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-[0.25em] uppercase text-rose-600 font-poppins">
            Exclusive Collection
          </span>
        </div>
        <h1 className="font-outfit font-light text-4xl sm:text-5xl lg:text-[54px] leading-[1.04] text-neutral-950 tracking-tight">
          Our
          <span className="block font-semibold text-neutral-950">Collection</span>
        </h1>
      </div>

      {/* Column Headers */}
      <div className="flex items-center justify-between px-5 mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
        <span>PRODUCT</span>
        <span className="mr-14">PRICE</span>
      </div>

      {/* Vertical Carousel List */}
      <div className="space-y-3 relative">
        {visibleIndices.map((prodIdx, slotIdx) => {
          const item = products[prodIdx];
          const isCurrent = slotIdx === 0;

          return (
            <div
              key={`${item.id}-${slotIdx}`}
              data-slot-index={slotIdx}
              onClick={() => {
                if (!isCurrent && !isAnimating) {
                  onSelectProduct(prodIdx);
                }
              }}
              className={`product-pill-bar group relative flex items-center justify-between h-[68px] sm:h-[72px] px-5 rounded-[22px] cursor-pointer transition-all duration-300 ${
                isCurrent
                  ? "bg-white/95 backdrop-blur-md shadow-[0_14px_36px_rgba(0,0,0,0.08)] border border-neutral-200/90 ring-1 ring-rose-500/20"
                  : "bg-white/70 backdrop-blur-sm hover:bg-white/90 shadow-[0_6px_20px_rgba(0,0,0,0.03)] border border-white/80 hover:border-neutral-200/80 opacity-80 hover:opacity-100"
              }`}
            >
              {/* Left active accent bar for current item */}
              {isCurrent && (
                <div className="absolute left-0 top-3 bottom-3 w-[3.5px] rounded-r-full bg-rose-500" />
              )}

              {/* Left: Product Name */}
              <div className="flex flex-col justify-center pr-3 min-w-0 pl-1">
                <span
                  className={`font-poppins text-[15px] sm:text-[16px] truncate transition-colors duration-200 ${
                    isCurrent
                      ? "text-neutral-900 font-semibold"
                      : "text-neutral-600 group-hover:text-neutral-800 font-medium"
                  }`}
                >
                  {item.name}
                </span>
                <span className="text-[11px] font-medium text-neutral-400 mt-0.5">
                  Handcrafted Three Piece
                </span>
              </div>

              {/* Middle-Right: Price Badge */}
              <div className="mr-16 flex-shrink-0 text-right">
                <span
                  className={`font-poppins text-[13px] px-2.5 py-1 rounded-full font-bold transition-colors ${
                    isCurrent
                      ? "bg-rose-50 text-rose-600 border border-rose-100"
                      : "text-neutral-500 bg-neutral-100/70"
                  }`}
                >
                  {item.size}
                </span>
              </div>

              {/* Right: Small thumbnail cutout slightly overflowing the bar */}
              <div className="product-thumb-container absolute right-2 -top-2.5 -bottom-2.5 w-[68px] sm:w-[74px] flex items-center justify-center pointer-events-none transition-transform duration-300 group-hover:scale-108">
                <div className="relative w-full h-full">
                  <Image
                    src={item.thumb}
                    alt={item.name}
                    fill
                    sizes="80px"
                    className="object-contain object-center filter drop-shadow-[0_8px_14px_rgba(0,0,0,0.14)]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
