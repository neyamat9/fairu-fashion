'use client';

import React from 'react';
import { ColorVariant } from '@/types/fashion';

interface ColorSelectorProps {
  colors: ColorVariant[];
  selectedColorId: string;
  onSelectColor: (color: ColorVariant) => void;
}

export function ColorSelector({
  colors,
  selectedColorId,
  onSelectColor,
}: ColorSelectorProps) {
  const activeColor =
    colors.find((c) => c.id === selectedColorId) || colors[0];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs tracking-wider">
        <span className="text-stone-500 uppercase font-medium">Selected Color:</span>
        <span className="font-semibold text-stone-900">{activeColor.name}</span>
      </div>

      <div className="flex items-center gap-3">
        {colors.map((color) => {
          const isSelected = color.id === selectedColorId;
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onSelectColor(color)}
              aria-label={`Select ${color.name}`}
              className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 ${
                isSelected
                  ? 'ring-2 ring-stone-900 ring-offset-2 scale-110 shadow-sm'
                  : 'hover:scale-105 opacity-85 hover:opacity-100'
              }`}
            >
              {/* Swatch color bubble with inner border accent */}
              <span
                className="w-full h-full rounded-full border border-black/10 overflow-hidden relative shadow-inner"
                style={{ backgroundColor: color.hex }}
              >
                {/* Diagonal accent color slice */}
                <span
                  className="absolute bottom-0 right-0 w-4 h-4 rounded-tl-full opacity-90"
                  style={{ backgroundColor: color.accentHex }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-stone-500 italic">
        Fabric: <span className="text-stone-700 font-medium">{activeColor.fabricType}</span>
      </p>
    </div>
  );
}
