"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { SiteSettings } from "@/lib/services/site.service";

interface ShowcaseHeroProps {
  settings?: SiteSettings;
}

export const ShowcaseHero: React.FC<ShowcaseHeroProps> = ({ settings }) => {
  // Settings values with defaults
  const site = settings?.site;
  const slides = site?.heroModels && site.heroModels.length > 0
    ? site.heroModels
    : [
        "/hero/hero-slide-1.webp",
        "/hero/hero-slide-2.webp",
        "/hero/hero-slide-3.webp",
      ];
  
  const titleMain = site?.heroTitle || "Exclusive";
  const titleHighlight = site?.heroHighlight || "Women's Fashion";
  const description = site?.heroDescription || "Discover our exclusive collection of women's three piece, two piece, and ready-to-wear outfits crafted for everyday grace and celebrations.";
  const buttonText = site?.heroButtonText || "Shop Now";
  const buttonLink = site?.heroButtonLink || "/products";
  const intervalSeconds = site?.heroIntervalSeconds && site.heroIntervalSeconds > 0
    ? site.heroIntervalSeconds
    : 5;

  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-cycle hero photo slides every 5 seconds with smooth crossfade
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [slides.length, intervalSeconds]);

  return (
    <section className="relative w-full overflow-hidden bg-[#EFE8DF] select-none min-h-[660px] sm:min-h-[740px] lg:min-h-[820px] xl:min-h-[880px] flex flex-col justify-between">
      {/* ============================================================ */}
      {/* 1. SCENE BACKGROUND SLIDES (Model with architectural setting) */}
      {/* ============================================================ */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="sync">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="absolute inset-0 w-full h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slides[currentIndex]?.includes('/hero/') ? slides[currentIndex].slice(slides[currentIndex].indexOf('/hero/')) : slides[currentIndex]}
              alt={`Fairu Fashion Hero ${currentIndex + 1}`}
              className="w-full h-full object-cover object-[70%_center] sm:object-center"
            />
          </motion.div>
        </AnimatePresence>

        {/* Soft atmospheric gradient across left side to ensure typography pops effortlessly */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F6F1EA]/75 via-[#F6F1EA]/40 to-transparent pointer-events-none lg:w-[65%]" />
      </div>

      {/* ============================================================ */}
      {/* 2. HERO CONTENT & TYPOGRAPHY "WRITTEN ON THE WALL"           */}
      {/* ============================================================ */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex-1 flex flex-col justify-center my-auto pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8">
          
          {/* LEFT COLUMN: Wall Typography */}
          <div className="lg:col-span-7 xl:col-span-6 z-20 flex flex-col justify-center pt-2 sm:pt-4 lg:pt-0 max-w-[620px]">
            {/* Display Headline written seamlessly on the textured wall */}
            <h1 className="font-serif text-[42px] sm:text-[56px] lg:text-[66px] xl:text-[74px] leading-[1.08] text-[#221B19] tracking-[-0.02em] mb-5 sm:mb-6">
              {/* Line 1: Grace in Every */}
              <span className="block font-medium drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]">
                {titleMain}
              </span>
              {/* Line 2: Three Piece in gorgeous italic cursive serif */}
              <span className="block font-normal italic font-serif text-[#A25E70] drop-shadow-[0_1px_1px_rgba(255,255,255,0.6)]">
                {titleHighlight}
              </span>
            </h1>

            {/* Description Paragraph */}
            <p className="text-[14px] sm:text-[15px] lg:text-[16px] leading-[1.7] text-[#554C47] max-w-[460px] font-sans mb-8 sm:mb-9 font-normal">
              {description}
            </p>

            {/* CTA Button */}
            <div className="flex items-center gap-4">
              <Link
                href={buttonLink}
                className="group inline-flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 sm:py-4 rounded-md bg-[#9E596B] hover:bg-[#8B485A] text-white text-[14px] font-medium tracking-wide shadow-[0_4px_16px_rgba(158,89,107,0.25)] hover:shadow-[0_6px_20px_rgba(158,89,107,0.35)] transition-all duration-300 hover:scale-[1.02]"
              >
                <span>{buttonText}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Natural space for model in background */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-6 pointer-events-none" />

        </div>
      </div>

      {/* Subtle bottom spacer */}
      <div className="h-4 sm:h-6 pointer-events-none" />
    </section>
  );
};
