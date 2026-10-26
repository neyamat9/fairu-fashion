"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShowcaseProduct } from "@/lib/showcaseProducts";

interface ProductCutoutProps {
  product: ShowcaseProduct;
  parallax: { x: number; y: number };
  cutoutRef: React.RefObject<HTMLDivElement | null>;
  isReducedMotion?: boolean;
}

export const ProductCutout: React.FC<ProductCutoutProps> = ({
  product,
  parallax,
  cutoutRef,
  isReducedMotion = false,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-end pointer-events-none z-20">
      {/* Dress Cutout Container (can break out of top card edge) */}
      <div
        ref={cutoutRef}
        style={{
          transform: isReducedMotion
            ? "none"
            : `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
          transition: "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
          willChange: "transform, opacity, filter",
        }}
        className="hero-cutout-container relative w-[320px] sm:w-[380px] md:w-[440px] lg:w-[490px] xl:w-[540px] h-[82%] sm:h-[86%] md:h-[90%] lg:h-[94%] xl:h-[98%] flex items-end justify-center pointer-events-auto"
      >
        <Link
          href={product.href}
          className="relative block w-full h-full select-none cursor-pointer group"
          aria-label={`View ${product.name}`}
        >
          {/* Subtle hover aura glow */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-40 transition-opacity duration-500 blur-2xl rounded-full"
            style={{
              background: `radial-gradient(circle, ${product.theme.from} 0%, transparent 70%)`,
            }}
          />

          {/* Idle Sway & Float Container */}
          <div className="hero-product-idle relative w-full h-full flex items-end justify-center">
            <div className="relative w-full h-full max-h-[820px]">
              <Image
                src={product.cutout}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 640px) 340px, (max-width: 1024px) 440px, 540px"
                className="object-contain object-bottom filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.18)]"
              />
            </div>
          </div>
        </Link>
      </div>

      {/* Soft Contact Shadow below the dress */}
      <div
        aria-hidden="true"
        className="hero-contact-shadow w-52 sm:w-64 md:w-80 h-7 rounded-[100%] bg-neutral-900/15 blur-lg mt-[-10px] sm:mt-[-16px] pointer-events-none select-none z-10 transition-transform duration-300"
      />
    </div>
  );
};
