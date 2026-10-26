"use client";

import CategoryNav from "@/components/layout/CategoryNav";
import SiteHeader from "@/components/layout/SiteHeader";
import type { Category } from "@/lib/types";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Sticky site chrome. Scrolling down tucks the full header away so only the thin
 * category bar stays pinned (the cart button then slides into it); scrolling
 * up brings the full header gliding back.
 */
export default function SiteChrome({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const wrap = useRef<HTMLDivElement>(null);
  const headerBox = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(isHome);
  const [headerH, setHeaderH] = useState(80);
  const [scrolledPastHero, setScrolledPastHero] = useState(!isHome);

  useEffect(() => {
    setScrolledPastHero(!isHome);
    setCompact(isHome);
  }, [isHome]);

  // Tell the rest of the page how much navbar is currently pinned
  useEffect(() => {
    const total = wrap.current?.offsetHeight ?? 0;
    const bar = Math.max(0, total - headerH);
    document.documentElement.style.setProperty("--sticky-top", `${(compact ? bar : total) + 16}px`);
    document.documentElement.style.setProperty("--chrome-full", `${total + 16}px`);
  }, [compact, headerH]);

  useEffect(() => {
    const measure = () => setHeaderH(headerBox.current?.offsetHeight ?? 80);
    measure();
    const ro = new ResizeObserver(measure);
    if (headerBox.current) ro.observe(headerBox.current);

    let last = window.scrollY;
    let state = isHome;
    const onScroll = () => {
      const y = window.scrollY;
      const h = headerBox.current?.offsetHeight ?? 80;
      const delta = y - last;

      if (isHome) {
        if (y < 420) {
          setScrolledPastHero(false);
          setCompact(true);
          state = true;
        } else {
          setScrolledPastHero(true);
          if (delta < -2 && state) {
            state = false;
            setCompact(false);
          } else if (delta > 6 && !state && y > 600) {
            state = true;
            setCompact(true);
          }
        }
      } else {
        if (y <= h * 0.6) {
          if (state) {
            state = false;
            setCompact(false);
          }
        } else if (delta > 6 && !state && y > h + 40) {
          state = true;
          setCompact(true);
        } else if (delta < -2 && state) {
          state = false;
          setCompact(false);
        }
      }
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [isHome]);

  const isHiddenOnHome = isHome && !scrolledPastHero;

  return (
    <div
      ref={wrap}
      className={`sticky z-[1001] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isHiddenOnHome ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        top: isHiddenOnHome ? -headerH - 20 : compact ? -headerH : 0,
      }}
    >
      <div ref={headerBox}>
        <SiteHeader />
      </div>
      {/* Hidden for now as requested: CategoryNav under main navbar */}
      {/* <CategoryNav categories={categories} compact={compact} /> */}
    </div>
  );
}
