'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { FASHION_PRODUCTS } from '@/lib/fashion-data';
import { ColorVariant } from '@/types/fashion';
import { ProductInfoPanel } from './ProductInfoPanel';
import { ArrowRight, RotateCw, Eye } from 'lucide-react';

// Dynamic import with SSR: false ensures Three.js WebGL canvas never causes hydration issues
const FashionScene = dynamic(
  () => import('./FashionScene').then((mod) => mod.FashionScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF8F5]">
        <div className="w-12 h-12 rounded-full border-2 border-stone-300 border-t-stone-800 animate-spin mb-4" />
        <p className="text-xs font-serif tracking-widest text-stone-500 uppercase">
          Preparing Fairu Fashion 3D Atelier...
        </p>
      </div>
    ),
  }
);

export function FashionHero() {
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [manualRotationY, setManualRotationY] = useState<number>(0);
  const [activeColorMap, setActiveColorMap] = useState<Record<string, ColorVariant>>({});

  const selectedProduct = FASHION_PRODUCTS.find((p) => p.id === selectedProductId);
  const activeColor = selectedProduct
    ? activeColorMap[selectedProduct.id] ||
      selectedProduct.colors.find((c) => c.id === selectedProduct.defaultColorId) ||
      selectedProduct.colors[0]
    : undefined;

  const handleSelectColor = (color: ColorVariant) => {
    if (!selectedProductId) return;
    setActiveColorMap((prev) => ({
      ...prev,
      [selectedProductId]: color,
    }));
  };

  const handleRotateDrag = (delta: number) => {
    setManualRotationY((prev) => prev + delta);
  };

  const handleRotate180 = () => {
    setManualRotationY((prev) => prev + Math.PI);
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setManualRotationY(0);
  };

  const handleCloseDetail = () => {
    setSelectedProductId(null);
    setManualRotationY(0);
  };

  return (
    <section className="relative w-full h-[88vh] min-h-[640px] max-h-[920px] bg-[#FAF8F5] overflow-hidden flex flex-col justify-between">
      {/* Background Soft Alabaster Radial Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(255, 255, 255, 0.95) 0%, rgba(245, 242, 235, 0.8) 70%, rgba(238, 233, 222, 0.9) 100%)',
        }}
      />

      {/* ============================================================ */}
      {/* TOP EDITORIAL OVERLAY                                         */}
      {/* ============================================================ */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-col items-center text-center pointer-events-none">
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.25em] uppercase text-stone-500 mb-2">
          Fairu Fashion • 2026 Atelier Collection
        </span>

        {!selectedProductId ? (
          <>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif tracking-tight text-stone-900 max-w-2xl leading-[1.12]">
              Discover Your Own Elegance
            </h1>
            <p className="mt-2.5 text-xs sm:text-sm text-stone-600 max-w-lg font-sans">
              Thoughtfully curated Pakistani lawn, luxury Swiss cotton, and fine embroidered three-piece ensembles.
            </p>

            <div className="mt-4 flex items-center gap-3 pointer-events-auto">
              <a
                href="/products"
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold tracking-widest uppercase px-5 py-2.5 rounded-full transition-all duration-200 shadow-sm"
              >
                <span>Explore Collection</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>

              <div className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-stone-500 bg-white/80 backdrop-blur-sm border border-stone-200/80 px-3.5 py-2 rounded-full">
                <RotateCw className="w-3 h-3 text-stone-700 animate-pulse" />
                <span>Hover dress to inspect back • Click to open</span>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* ============================================================ */}
      {/* 3D SCENE CANVAS                                              */}
      {/* ============================================================ */}
      <div className="absolute inset-0 w-full h-full z-0">
        <FashionScene
          products={FASHION_PRODUCTS}
          hoveredProductId={hoveredProductId}
          selectedProductId={selectedProductId}
          activeColorMap={activeColorMap}
          manualRotationY={manualRotationY}
          onHoverProduct={setHoveredProductId}
          onSelectProduct={handleSelectProduct}
          onRotateDrag={handleRotateDrag}
        />
      </div>

      {/* ============================================================ */}
      {/* SELECTED PRODUCT SIDE PANEL (DESKTOP: RIGHT, MOBILE: OVERLAY) */}
      {/* ============================================================ */}
      {selectedProduct && activeColor && (
        <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8 flex justify-end pointer-events-none">
          <div className="pointer-events-auto w-full sm:w-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <ProductInfoPanel
              product={selectedProduct}
              activeColor={activeColor}
              onSelectColor={handleSelectColor}
              onClose={handleCloseDetail}
              onRotate180={handleRotate180}
            />
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* BOTTOM QUICK DRESS SELECTOR RAIL (WHEN IN COLLECTION MODE)   */}
      {/* ============================================================ */}
      {!selectedProductId && (
        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pb-5 flex flex-col items-center">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto max-w-full p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-stone-200/70 shadow-sm">
            <span className="hidden md:inline text-[11px] font-semibold text-stone-400 uppercase tracking-widest pl-2">
              Select Suit:
            </span>
            {FASHION_PRODUCTS.map((prod) => {
              const isHovered = hoveredProductId === prod.id;
              const color =
                activeColorMap[prod.id] ||
                prod.colors.find((c) => c.id === prod.defaultColorId) ||
                prod.colors[0];

              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => handleSelectProduct(prod.id)}
                  onMouseEnter={() => setHoveredProductId(prod.id)}
                  onMouseLeave={() => setHoveredProductId(null)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ${
                    isHovered
                      ? 'bg-stone-900 text-white shadow-sm'
                      : 'bg-stone-100/80 hover:bg-stone-200/80 text-stone-800'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-inner"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="font-medium whitespace-nowrap">
                    {prod.brand}: {prod.subtitle.split('&')[0]}
                  </span>
                  <Eye className="w-3 h-3 opacity-60" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
