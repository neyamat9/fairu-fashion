"use client";

import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

const CURATED_TAGS = [
  { label: "New Releases", href: "/browse?sort=newest" },
  { label: "Three Piece", href: "/category/three-piece" },
  { label: "Luxury Lawn", href: "/category/lawn" },
  { label: "Festive Edit", href: "/category/party-wear" },
  { label: "Pure Silk", href: "/category/silk" },
];

export const HeroNav: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-between px-2 sm:px-6 pt-4 pb-2 z-30 select-none">
      {/* Curated Collection Tag Pills */}
      <nav
        aria-label="Collection quick links"
        className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1"
      >
        {CURATED_TAGS.map((tag, idx) => (
          <Link
            key={tag.label}
            href={tag.href}
            className={`font-poppins text-xs font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 whitespace-nowrap ${
              idx === 0
                ? "bg-white/90 text-neutral-900 shadow-sm border border-neutral-200/80 hover:bg-neutral-900 hover:text-white"
                : "bg-white/60 text-neutral-600 hover:bg-white/90 hover:text-neutral-900 border border-white/60 hover:shadow-sm"
            }`}
          >
            {tag.label}
          </Link>
        ))}
      </nav>

      {/* Right boutique announcement badge */}
      <div className="hidden md:flex items-center gap-2 font-poppins text-xs font-medium text-neutral-600 bg-white/70 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/80 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-rose-500" />
        <span>Authentic Boutique Craftsmanship</span>
      </div>
    </div>
  );
};
