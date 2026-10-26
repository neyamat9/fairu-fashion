"use client";

import React from "react";

interface HeroTitleProps {
  lines: string[];
}

export const HeroTitle: React.FC<HeroTitleProps> = ({ lines }) => {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col select-none pointer-events-none drop-shadow-[0_16px_32px_rgba(0,0,0,0.22)] z-15 relative w-full"
    >
      {lines.map((line, idx) => (
        <div key={idx} className="overflow-hidden py-0.5 sm:py-1">
          <span
            data-title-line
            className="hero-title-line block font-lilita text-white tracking-wide text-4xl sm:text-5xl md:text-6xl lg:text-[56px] xl:text-[66px] leading-[0.94] uppercase whitespace-nowrap"
          >
            {line}
          </span>
        </div>
      ))}
    </div>
  );
};
