'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FASHION_PRODUCTS } from '@/lib/fashion-data';
import { FashionProduct3D } from '@/types/fashion';
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  X,
  ShoppingBag,
  Check,
  Sparkles,
} from 'lucide-react';

export function FashionHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewSide, setViewSide] = useState<'front' | 'back'>('front');
  const [isRailView, setIsRailView] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedSize, setSelectedSize] = useState('Unstitched');
  const [isAdded, setIsAdded] = useState(false);

  const currentProduct = FASHION_PRODUCTS[activeIndex] || FASHION_PRODUCTS[0];

  const handlePrev = () => {
    setViewSide('front');
    setActiveIndex((prev) => (prev === 0 ? FASHION_PRODUCTS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setViewSide('front');
    setActiveIndex((prev) => (prev === FASHION_PRODUCTS.length - 1 ? 0 : prev + 1));
  };

  const handleAddToBag = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <section className="relative w-full min-h-[92vh] bg-[#F5F4F0] overflow-hidden flex flex-col justify-between select-none">
      {/* ============================================================ */}
      {/* 1. TOP MINIMALIST HEADER BAR                                 */}
      {/* ============================================================ */}
      <div className="relative z-20 w-full max-w-7xl mx-auto px-6 pt-5 flex items-center justify-between text-xs tracking-widest uppercase font-semibold text-stone-800">
        <div className="flex items-center gap-6">
          <span className="text-stone-400">FAIRU ATELIER</span>
          <button
            type="button"
            onClick={() => setIsRailView((prev) => !prev)}
            className="hover:text-black underline underline-offset-4 transition-colors"
          >
            {isRailView ? 'FOCUS VIEW' : 'VIEW FULL RAIL'}
          </button>
        </div>

        <div className="text-sm font-bold tracking-[0.3em] font-serif">
          FAIRU FASHION
        </div>

        <div className="flex items-center gap-5">
          <a href="/products" className="hover:text-black transition-colors">
            COLLECTION
          </a>
          <a href="/cart" className="hover:text-black transition-colors">
            BAG (0)
          </a>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. HORIZONTAL STEEL RAIL WIRE                                */}
      {/* ============================================================ */}
      <div className="absolute top-[18%] sm:top-[16%] inset-x-0 z-10 pointer-events-none">
        <div className="relative w-full max-w-[1400px] mx-auto px-4">
          {/* Main Metallic Wire Line */}
          <div className="w-full h-[2px] bg-gradient-to-r from-stone-300 via-stone-400 to-stone-300 shadow-sm" />
          {/* Rail End Fasteners */}
          <div className="absolute left-4 -top-[3px] w-2 h-2 rounded-full bg-stone-500" />
          <div className="absolute right-4 -top-[3px] w-2 h-2 rounded-full bg-stone-500" />
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. CENTRAL STAGE (FOCUS VIEW OR RAIL VIEW)                   */}
      {/* ============================================================ */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full px-4 pt-12 pb-4">
        {!isRailView ? (
          /* ============================================================ */
          /* FOCUS VIEW (EXACTLY MATCHING SCREENSHOT 1)                  */
          /* ============================================================ */
          <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
            {/* Left & Right Blurred Background Garments on Rail */}
            <div className="absolute inset-y-0 inset-x-[-10%] flex items-center justify-between pointer-events-none opacity-35 blur-[7px] scale-90">
              {/* Left Neighbor */}
              <div className="w-48 sm:w-64 h-[420px] relative">
                {FASHION_PRODUCTS[(activeIndex - 1 + FASHION_PRODUCTS.length) % FASHION_PRODUCTS.length] && (
                  <Image
                    src={
                      FASHION_PRODUCTS[
                        (activeIndex - 1 + FASHION_PRODUCTS.length) % FASHION_PRODUCTS.length
                      ].imageFront
                    }
                    alt="Previous Suit"
                    fill
                    className="object-contain"
                  />
                )}
              </div>
              {/* Right Neighbor */}
              <div className="w-48 sm:w-64 h-[420px] relative">
                {FASHION_PRODUCTS[(activeIndex + 1) % FASHION_PRODUCTS.length] && (
                  <Image
                    src={FASHION_PRODUCTS[(activeIndex + 1) % FASHION_PRODUCTS.length].imageFront}
                    alt="Next Suit"
                    fill
                    className="object-contain"
                  />
                )}
              </div>
            </div>

            {/* Left / Right Navigation Controls */}
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Garment"
              className="absolute left-0 sm:-left-12 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/70 hover:bg-white backdrop-blur-md border border-stone-200/80 shadow-md flex items-center justify-center text-stone-700 hover:text-black transition-all hover:scale-105 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Garment"
              className="absolute right-0 sm:-right-12 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/70 hover:bg-white backdrop-blur-md border border-stone-200/80 shadow-md flex items-center justify-center text-stone-700 hover:text-black transition-all hover:scale-105 active:scale-95"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Main Center Garment Container with 3D Flip */}
            <div className="relative w-full max-w-[340px] sm:max-w-[420px] h-[480px] sm:h-[550px] flex items-center justify-center">
              {/* Wooden Hanger & Wire Hook Hanging from Rail */}
              <div className="absolute -top-7 sm:-top-8 inset-x-0 flex flex-col items-center z-20 pointer-events-none">
                {/* Thin Metallic Hook looping over rail */}
                <svg width="24" height="28" viewBox="0 0 24 28" fill="none" className="drop-shadow-sm">
                  <path
                    d="M12 28V14C12 7.37 17.37 2 24 2"
                    stroke="#44403C"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="27" r="1.5" fill="#44403C" />
                </svg>
                {/* Wooden Curved Hanger Top */}
                <svg width="190" height="34" viewBox="0 0 190 34" fill="none" className="drop-shadow-sm -mt-1">
                  <path
                    d="M3 31C35 15 70 5 95 5C120 5 155 15 187 31C189 32 186 34 184 33C155 21 120 12 95 12C70 12 35 21 6 33C4 34 1 32 3 31Z"
                    fill="#5C381E"
                  />
                  <rect x="91" y="0" width="8" height="6" rx="1" fill="#784B28" />
                </svg>
              </div>

              {/* Realistic Floating Price Tags on Strings (Screenshot 1) */}
              <div className="absolute -right-3 sm:-right-8 top-16 z-20 flex flex-col gap-2 pointer-events-auto">
                {/* Thin Thread */}
                <div className="w-[1px] h-6 bg-stone-400/80 mx-auto -mb-1" />

                {/* Black Tag (Color Badge) */}
                <div className="bg-black text-white text-[9px] font-bold tracking-widest px-2.5 py-4 rounded-[2px] shadow-lg rotate-[7deg] border border-stone-800 transition-transform hover:rotate-0 cursor-default">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/40 mx-auto mb-2" />
                  <span className="[writing-mode:vertical-rl] uppercase">
                    {currentProduct.colors[0]?.name || 'PREMIUM'}
                  </span>
                </div>

                {/* Kraft Paper Tan Tag (Brand / Price) */}
                <div className="bg-[#D8BA8E] text-stone-900 text-[9px] font-bold tracking-wider px-2.5 py-4 rounded-[2px] shadow-md rotate-[-5deg] border border-[#C2A375] transition-transform hover:rotate-0 cursor-default">
                  <div className="w-1.5 h-1.5 rounded-full bg-stone-700/40 mx-auto mb-2" />
                  <span className="[writing-mode:vertical-rl] uppercase">
                    FAIRU • ৳{currentProduct.price}
                  </span>
                </div>
              </div>

              {/* 3D Flip Garment Card */}
              <div
                className="relative w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: viewSide === 'back' ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* Front Side */}
                <div
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    filter: 'drop-shadow(0 25px 30px rgba(0, 0, 0, 0.12))',
                  }}
                >
                  <Image
                    src={currentProduct.imageFront}
                    alt={`${currentProduct.name} - Front`}
                    fill
                    priority
                    sizes="(max-width: 768px) 320px, 420px"
                    className="object-contain"
                  />
                </div>

                {/* Back Side (180deg mirrored) */}
                <div
                  className="absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    filter: 'drop-shadow(0 25px 30px rgba(0, 0, 0, 0.12))',
                  }}
                >
                  <Image
                    src={currentProduct.imageBack}
                    alt={`${currentProduct.name} - Back`}
                    fill
                    sizes="(max-width: 768px) 320px, 420px"
                    className="object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Product Title in Bold Tracking Uppercase (Screenshot 1) */}
            <h2 className="mt-2 text-base sm:text-lg md:text-xl font-bold tracking-[0.16em] uppercase text-stone-900 text-center font-sans">
              {currentProduct.name}
            </h2>

            {/* Pill Toggle Button: [ FRONT ] [ BACK ] (Screenshot 1) */}
            <div className="mt-3.5 flex items-center p-1 bg-stone-200/80 rounded-full border border-stone-300/80 shadow-inner">
              <button
                type="button"
                onClick={() => setViewSide('front')}
                className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                  viewSide === 'front'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-stone-600 hover:text-black'
                }`}
              >
                FRONT
              </button>

              <button
                type="button"
                onClick={() => setViewSide('back')}
                className={`px-5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
                  viewSide === 'back'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-stone-600 hover:text-black'
                }`}
              >
                BACK
              </button>
            </div>

            {/* SEE AVAILABILITY ↗ Button (Screenshot 1) */}
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.15em] uppercase text-stone-800 hover:text-black underline underline-offset-4 transition-colors"
            >
              <span>SEE AVAILABILITY</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* ============================================================ */
          /* RAIL VIEW (EXACTLY MATCHING SCREENSHOT 2)                    */
          /* ============================================================ */
          <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center">
            {/* The Full Hanging Rack of 4 Suits */}
            <div className="w-full flex items-center justify-center gap-4 sm:gap-8 md:gap-12 overflow-x-auto py-8">
              {FASHION_PRODUCTS.map((prod, index) => {
                const isCurrent = index === activeIndex;
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setActiveIndex(index);
                      setIsRailView(false);
                    }}
                    className={`group relative flex flex-col items-center flex-shrink-0 transition-all duration-300 ${
                      isCurrent
                        ? 'scale-105 opacity-100 z-10'
                        : 'scale-95 opacity-85 hover:opacity-100 hover:scale-100'
                    }`}
                  >
                    {/* Hanger Hook Top */}
                    <div className="w-12 h-6 flex flex-col items-center -mb-1">
                      <svg width="18" height="22" viewBox="0 0 24 28" fill="none">
                        <path
                          d="M12 28V14C12 7.37 17.37 2 24 2"
                          stroke="#44403C"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="w-24 h-2 bg-[#5C381E] rounded-full shadow-sm -mt-0.5" />
                    </div>

                    {/* Suit Image Cutout */}
                    <div
                      className="w-36 sm:w-44 md:w-56 h-[320px] sm:h-[380px] md:h-[450px] relative transition-transform group-hover:-translate-y-2 duration-300"
                      style={{
                        filter: 'drop-shadow(0 20px 22px rgba(0, 0, 0, 0.14))',
                      }}
                    >
                      <Image
                        src={prod.imageFront}
                        alt={prod.name}
                        fill
                        sizes="(max-width: 768px) 180px, 240px"
                        className="object-contain"
                      />
                    </div>

                    <span className="mt-2 text-[11px] font-bold tracking-wider uppercase text-stone-800 opacity-0 group-hover:opacity-100 transition-opacity">
                      {prod.brand} • ৳{prod.price}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom Button in Rail View */}
            <button
              type="button"
              onClick={() => setIsRailView(false)}
              className="mt-4 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-black text-white text-xs font-bold tracking-widest uppercase hover:bg-stone-800 transition-colors shadow-md"
            >
              <span>INSPECT SELECTED SUIT</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. VIBRANT NEON GREEN RUNNING MARQUEE (SCREENSHOT 1 & 2)     */}
      {/* ============================================================ */}
      <div className="relative z-20 w-full bg-[#10B981] sm:bg-[#00FF55] py-2 overflow-hidden border-t border-black/10">
        <div className="flex whitespace-nowrap animate-marquee font-bold text-xs sm:text-sm tracking-[0.25em] uppercase text-black font-sans">
          <span className="mx-6">NEW DROPS • FAIRU FASHION</span>
          <span className="mx-6">IT'S US, NEVER THEM</span>
          <span className="mx-6">PAKISTANI LAWN THREE PIECE</span>
          <span className="mx-6">SUMMER 2026 ATELIER</span>
          <span className="mx-6">FREE EXPRESS DELIVERY IN BANGLADESH</span>
          <span className="mx-6">NEW DROPS • FAIRU FASHION</span>
          <span className="mx-6">IT'S US, NEVER THEM</span>
          <span className="mx-6">PAKISTANI LAWN THREE PIECE</span>
          <span className="mx-6">SUMMER 2026 ATELIER</span>
          <span className="mx-6">FREE EXPRESS DELIVERY IN BANGLADESH</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. SLIDE-OUT AVAILABILITY & PURCHASE DRAWER                  */}
      {/* ============================================================ */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-stone-200">
                <span className="text-xs font-bold tracking-widest uppercase text-stone-500">
                  {currentProduct.brand} ATELIER
                </span>
                <button
                  type="button"
                  onClick={() => setShowDrawer(false)}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-600 hover:text-black transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Garment Preview */}
              <div className="mt-5 flex gap-4 items-center">
                <div className="w-20 h-28 relative rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200">
                  <Image
                    src={currentProduct.imageFront}
                    alt={currentProduct.name}
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-wider uppercase text-stone-900 leading-snug">
                    {currentProduct.name}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-stone-900">
                      ৳{currentProduct.price.toLocaleString()}
                    </span>
                    <span className="text-xs text-stone-400 line-through">
                      ৳{currentProduct.originalPrice.toLocaleString()}
                    </span>
                  </div>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    In Stock • Ready to Dispatch
                  </span>
                </div>
              </div>

              {/* Size Selector */}
              <div className="mt-6">
                <div className="text-xs font-bold tracking-wider uppercase text-stone-800 mb-2.5">
                  Select Option / Size:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {currentProduct.sizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSelectedSize(sz)}
                      className={`text-xs font-semibold py-2.5 px-3 rounded-lg border text-center transition-all ${
                        selectedSize === sz
                          ? 'border-black bg-black text-white shadow-sm'
                          : 'border-stone-200 text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Piece Breakdown */}
              <div className="mt-6 p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-xs space-y-2 text-stone-600">
                <div className="font-bold text-stone-900 text-[11px] uppercase tracking-wider">
                  Suite Inclusions:
                </div>
                <p>• <strong>Kameez:</strong> {currentProduct.fabricDetails.kameez}</p>
                <p>• <strong>Dupatta:</strong> {currentProduct.fabricDetails.dupatta}</p>
                <p>• <strong>Salwar:</strong> {currentProduct.fabricDetails.salwar}</p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-stone-200 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleAddToBag}
                className={`w-full py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-2 ${
                  isAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-black text-white hover:bg-stone-800 shadow-md'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" /> Added to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" /> Add to Bag • ৳{currentProduct.price}
                  </>
                )}
              </button>

              <a
                href="/checkout"
                className="w-full py-3.5 px-4 rounded-xl text-xs font-bold tracking-widest uppercase text-center bg-stone-100 hover:bg-stone-200 text-stone-900 transition-colors"
              >
                Direct Checkout
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
