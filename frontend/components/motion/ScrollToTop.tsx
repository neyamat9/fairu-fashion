"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "./gsap";

const R = 21;
const C = 2 * Math.PI * R;

/** Floating back-to-top button with a scroll-progress ring; springs in after the first screen. */
export default function ScrollToTop() {
  const btn = useRef<HTMLButtonElement>(null);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = btn.current;
    if (!el) return;
    gsap.set(el, { autoAlpha: 0, y: 30, scale: 0.5 });
    let shown = false;
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (ring.current) ring.current.style.strokeDashoffset = String(C * (1 - self.progress));
        const should = window.scrollY > 600;
        if (should !== shown) {
          shown = should;
          gsap.to(
            el,
            should
              ? { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(2)", overwrite: true }
              : { autoAlpha: 0, y: 30, scale: 0.5, duration: 0.35, ease: "power2.in", overwrite: true },
          );
        }
      },
    });
    return () => st.kill();
  }, []);

  function toTop() {
    const w = window as unknown as { __lenis?: { scrollTo: (n: number, o?: object) => void } };
    if (w.__lenis) w.__lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    const arrow = btn.current?.querySelector(".arrow");
    if (arrow) gsap.fromTo(arrow, { y: 0 }, { y: -6, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" });
  }

  return (
    <button
      ref={btn}
      type="button"
      onClick={toTop}
      aria-label="Scroll to top"
      className="group fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[1500] flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded bg-card text-foreground shadow-xl transition-colors hover:bg-brand-orange hover:text-on-orange"
      style={{ visibility: "hidden" }}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={R} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="2.5" />
        <circle
          ref={ring}
          cx="24"
          cy="24"
          r={R}
          fill="none"
          className="stroke-brand-orange group-hover:stroke-on-orange"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C}
        />
      </svg>
      <ArrowUp className="arrow relative h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
    </button>
  );
}
