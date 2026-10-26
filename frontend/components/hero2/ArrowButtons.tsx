"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ArrowButtonsProps {
  onPrev: () => void;
  onNext: () => void;
  currentIndex?: number;
  total?: number;
  disabled?: boolean;
}

export const ArrowButtons: React.FC<ArrowButtonsProps> = ({
  onPrev,
  onNext,
  currentIndex = 0,
  total = 5,
  disabled = false,
}) => {
  const currentFormatted = String(currentIndex + 1).padStart(2, "0");
  const totalFormatted = String(total).padStart(2, "0");

  return (
    <div className="flex items-center gap-4 z-30 select-none">
      {/* Chevron Navigation Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={disabled}
          aria-label="Previous product"
          className="group relative w-12 h-12 rounded-full bg-white/90 backdrop-blur-md hover:bg-neutral-900 border border-neutral-200/80 hover:border-neutral-900 text-neutral-700 hover:text-white transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <ChevronLeft className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          aria-label="Next product"
          className="group relative w-12 h-12 rounded-full bg-white/90 backdrop-blur-md hover:bg-neutral-900 border border-neutral-200/80 hover:border-neutral-900 text-neutral-700 hover:text-white transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Modern Slide Counter */}
      <div className="hidden sm:flex items-center gap-3 pl-2">
        <span className="font-poppins text-xs font-bold text-neutral-900 tracking-wider">
          {currentFormatted}
        </span>
        <div className="w-10 h-[2px] bg-neutral-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-500 ease-out"
            style={{
              width: `${((currentIndex + 1) / total) * 100}%`,
            }}
          />
        </div>
        <span className="font-poppins text-xs font-medium text-neutral-400 tracking-wider">
          {totalFormatted}
        </span>
      </div>
    </div>
  );
};
