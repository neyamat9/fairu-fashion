"use client";

import Lenis from "lenis";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { gsap, ScrollTrigger, MOTION_OK } from "./gsap";
import { scrollTopNow } from "./scroll-top";

/**
 * Buttery smooth scrolling (Lenis) driven by GSAP's ticker so ScrollTrigger
 * stays perfectly in sync, plus a thin brand-orange scroll-progress bar.
 */
/**
 * Every new page opens at the top — whether it was reached by a link, a button, a redirect or a search.
 * (Back/forward are left alone so the browser can restore where you were.)
 */
function ScrollToTopOnNavigate() {
  const path = usePathname();
  const qs = useSearchParams().toString();
  const popped = useRef(false);
  const first = useRef(true);

  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (popped.current) {
      popped.current = false;
      return;
    }
    scrollTopNow();
  }, [path, qs]);

  return null;
}

export default function SmoothScroll() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOTION_OK);
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    if (mq.matches) {
      lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const progress = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
      },
    });

    // Scroll-triggered animations are measured against the page layout. Images, fonts and
    // late-arriving data change that layout, so re-measure whenever the page height changes
    // (and after load / font swap) — otherwise titles can wait for a trigger point that moved.
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    window.addEventListener("load", refresh);
    void document.fonts?.ready.then(refresh);
    refresh();

    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("load", refresh);
      progress.kill();
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <ScrollToTopOnNavigate />
      </Suspense>
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[2000] h-[3px]" aria-hidden="true">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-brand-orange" />
    </div>
    </>
  );
}
