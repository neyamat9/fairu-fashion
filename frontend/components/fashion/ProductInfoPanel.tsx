'use client';

import React, { useState } from 'react';
import { FashionProduct3D, ColorVariant } from '@/types/fashion';
import { ColorSelector } from './ColorSelector';
import { ArrowLeft, ShoppingBag, Sparkles, Check, RotateCw } from 'lucide-react';

interface ProductInfoPanelProps {
  product: FashionProduct3D;
  activeColor: ColorVariant;
  onSelectColor: (color: ColorVariant) => void;
  onClose: () => void;
  onRotate180: () => void;
}

export function ProductInfoPanel({
  product,
  activeColor,
  onSelectColor,
  onClose,
  onRotate180,
}: ProductInfoPanelProps) {
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0]);
  const [isAdded, setIsAdded] = useState(false);

  const handleAddBag = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2200);
  };

  const discountPercent = Math.round(
    ((product.originalPrice - product.price) / product.originalPrice) * 100
  );

  return (
    <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl p-6 sm:p-7 shadow-xl border border-stone-200/80 transition-all duration-300">
      {/* Return to Rail Button */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-stone-600 hover:text-stone-900 transition-colors uppercase py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collection Rail
        </button>

        <button
          type="button"
          onClick={onRotate180}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-full transition-colors"
          title="Turn 180° to inspect back"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Flip 180°</span>
        </button>
      </div>

      {/* Brand & Badges */}
      <div className="pt-4 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-widest uppercase text-amber-800/90 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/60">
          {product.brand}
        </span>
        {product.isBestSeller && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" /> Best Seller
          </span>
        )}
      </div>

      {/* Product Title & Subtitle */}
      <h2 className="mt-2 text-xl sm:text-2xl font-serif tracking-tight text-stone-900 leading-snug">
        {product.name}
      </h2>
      <p className="text-xs text-stone-500 mt-1 font-sans">{product.subtitle}</p>

      {/* Price in BDT */}
      <div className="mt-3.5 flex items-baseline gap-3">
        <span className="text-2xl font-semibold text-stone-950 font-serif">
          ৳{product.price.toLocaleString()}
        </span>
        {product.originalPrice > product.price && (
          <>
            <span className="text-sm text-stone-400 line-through">
              ৳{product.originalPrice.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
              Save {discountPercent}%
            </span>
          </>
        )}
      </div>

      {/* Interactive Color Selector */}
      <div className="mt-5 pt-4 border-t border-stone-100">
        <ColorSelector
          colors={product.colors}
          selectedColorId={activeColor.id}
          onSelectColor={onSelectColor}
        />
      </div>

      {/* Size / Stitching Option Selector */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-stone-500 uppercase font-medium tracking-wider">Option / Size:</span>
          <span className="text-stone-900 font-semibold">{selectedSize}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((size) => {
            const isSelected = size === selectedSize;
            return (
              <button
                key={size}
                type="button"
                onClick={() => setSelectedSize(size)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 border ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Piece Fabric Specs */}
      <div className="mt-5 p-3 rounded-xl bg-stone-50/80 border border-stone-200/60 text-xs space-y-1.5 text-stone-600">
        <div className="font-semibold text-stone-800 uppercase tracking-wider text-[10px]">
          Included in 3-Piece Suite:
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-stone-400">•</span>
          <span><strong>Kameez:</strong> {product.fabricDetails.kameez}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-stone-400">•</span>
          <span><strong>Dupatta:</strong> {product.fabricDetails.dupatta}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="text-stone-400">•</span>
          <span><strong>Salwar:</strong> {product.fabricDetails.salwar}</span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={handleAddBag}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-200 ${
            isAdded
              ? 'bg-emerald-600 text-white'
              : 'bg-stone-900 text-white hover:bg-stone-800 active:scale-[0.99] shadow-sm'
          }`}
        >
          {isAdded ? (
            <>
              <Check className="w-4 h-4" /> Added to Bag!
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" /> Add to Bag
            </>
          )}
        </button>

        <a
          href="/checkout"
          className="flex-1 flex items-center justify-center py-3 px-4 rounded-xl text-xs font-bold tracking-wider uppercase bg-amber-700 hover:bg-amber-800 text-white text-center transition-all shadow-sm"
        >
          Order Now
        </a>
      </div>

      <p className="mt-3 text-center text-[11px] text-stone-400">
        Drag in the 3D area to rotate and inspect details
      </p>
    </div>
  );
}
