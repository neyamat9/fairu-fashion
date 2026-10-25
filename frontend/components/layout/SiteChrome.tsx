"use client";

import CategoryNav from "@/components/layout/CategoryNav";
import SiteHeader from "@/components/layout/SiteHeader";
import type { Category } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

/**
 * Sticky site chrome. Scrolling down tucks the full header away so only the thin
 * category bar stays pinned (the cart button then slides into it); scrolling
 * up brings the full header gliding back.
 */
export default function SiteChrome({ categories }: { categories: Category[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const headerBox = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [headerH, setHeaderH] = useState(0);

  // Tell the rest of the page how much navbar is currently pinned (full header + category bar, or just the bar),
  // so sticky sidebars can sit just below it and glide as it hides/shows.
  useEffect(() => {
    const total = wrap.current?.offsetHeight ?? 0;
    const bar = Math.max(0, total - headerH);
    document.documentElement.style.setProperty("--sticky-top", `${(compact ? bar : total) + 16}px`);
    // full height (header + category bar): what is pinned once the header slides back in
    document.documentElement.style.setProperty("--chrome-full", `${total + 16}px`);
  }, [compact, headerH]);

  useEffect(() => {
    const measure = () => setHeaderH(headerBox.current?.offsetHeight ?? 0);
    measure();
    const ro = new ResizeObserver(measure);
    if (headerBox.current) ro.observe(headerBox.current);

    let last = window.scrollY;
    let state = false;
    const onScroll = () => {
      const y = window.scrollY;
      const h = headerBox.current?.offsetHeight ?? 0;
      const delta = y - last;
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
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrap}
      className="sticky z-[1001]"
      style={{
        top: compact ? -headerH : 0,
        // glides away on the way down and glides back on the way up
        transition: "top 600ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div ref={headerBox}>
        <SiteHeader />
      </div>
      <CategoryNav categories={categories} compact={compact} />
    </div>
  );
}
