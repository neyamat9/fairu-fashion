"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, MOTION_OK } from "./gsap";

interface RevealGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrap a section in this and mark its parts with data attributes — each one
 * animates every time it scrolls into view — down or back up (never all at once):
 *
 *   data-split          headline: words rise out of a mask, one by one
 *   data-once           (add to any of the above) play once at page load instead of on scroll
 *   data-reveal         fade + rise (default)
 *   data-reveal="card"  3D flip-up with perspective (product cards)
 *   data-reveal="clip"  clip-path wipe with a de-zooming image (category cards)
 *   data-reveal="pop"   scale-in with a springy overshoot
 *   data-bar            an accent bar that draws itself out
 *   data-parallax       image drifts inside its card while scrolling
 *   data-tilt           card leans toward the cursor on hover
 *   data-drift="n"      decorative shape that floats on scroll
 */
export default function RevealGroup({ children, className }: RevealGroupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      // ── reduced motion: just show everything
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(root.querySelectorAll("[data-reveal], [data-split]"), { opacity: 1, visibility: "visible", clearProps: "transform" });
        root.querySelectorAll("[data-split]").forEach((el) => el.classList.add("is-split"));
      });

      mm.add(MOTION_OK, () => {
        const cleanups: (() => void)[] = [];
        // ── split headlines into masked words
        root.querySelectorAll<HTMLElement>("[data-split]").forEach((el) => {
          if (!el.dataset.splitDone) {
            splitWords(el);
            el.dataset.splitDone = "1";
          }
          el.classList.add("is-split");
          const words = el.querySelectorAll<HTMLElement>(".sw-i");
          gsap.set(words, { yPercent: 118, rotate: 5 });
          if (el.hasAttribute("data-once")) {
            // plays once when the page loads (after the hero intro starts) — never tied to scrolling
            gsap.to(words, { yPercent: 0, rotate: 0, duration: 1.15, ease: "expo.out", stagger: 0.07, delay: 0.5 });
            return;
          }
          // The browser's own visibility detection (not scroll-position maths), so a title can never
          // stay hidden because the page layout shifted after the triggers were measured.
          const io = new IntersectionObserver(
            ([entry]) => {
              if (entry.isIntersecting) play(words);
              else if (entry.boundingClientRect.bottom < 0 || entry.boundingClientRect.top > window.innerHeight) reset(words);
            },
            { rootMargin: "0px 0px -10% 0px" },
          );
          io.observe(el);
          cleanups.push(() => io.disconnect());
          function play(w: NodeListOf<HTMLElement>) {
            gsap.to(w, { yPercent: 0, rotate: 0, duration: 1.15, ease: "expo.out", stagger: 0.07, overwrite: true });
          }
          function reset(w: NodeListOf<HTMLElement>) {
            gsap.set(w, { yPercent: 118, rotate: 5 });
          }
        });

        // ── accent bars
        root.querySelectorAll<HTMLElement>("[data-bar]").forEach((el) => {
          gsap.set(el, { scaleX: 0, transformOrigin: "left center" });
          if (el.hasAttribute("data-once")) {
            gsap.to(el, { scaleX: 1, duration: 1.1, ease: "expo.out", delay: 0.9 });
            return;
          }
          ScrollTrigger.create({
            trigger: el,
            start: "top 92%",
            end: "bottom top",
            onEnter: () => gsap.to(el, { scaleX: 1, duration: 1.1, ease: "expo.out", overwrite: true }),
            onEnterBack: () => gsap.to(el, { scaleX: 1, duration: 1.1, ease: "expo.out", overwrite: true }),
            onLeave: () => gsap.set(el, { scaleX: 0 }),
            onLeaveBack: () => gsap.set(el, { scaleX: 0 }),
          });
        });

        // ── reveal styles, batched so each row/stagger fires as it enters view
        // Every time an item enters the viewport (scrolling down OR back up) it plays;
        // once it leaves, it resets so it can play again next time. Items that sit in the
        // same row are staggered left → right.
        const batchOf = (sel: string, from: gsap.TweenVars, to: gsap.TweenVars, start = "top 90%") => {
          const items = gsap.utils.toArray<HTMLElement>(sel, root);
          if (!items.length) return;
          gsap.set(items, from);
          const perRow = Math.max(1, items.filter((el) => Math.abs(el.offsetTop - items[0].offsetTop) < 4).length);
          const gap = typeof to.stagger === "number" ? to.stagger : 0.1;
          items.forEach((el, i) => {
            const play = () => gsap.to(el, { ...to, stagger: undefined, delay: (i % perRow) * gap, overwrite: true });
            const reset = () => {
              gsap.killTweensOf(el);
              gsap.set(el, from);
            };
            ScrollTrigger.create({
              trigger: el,
              start,
              end: "bottom top",
              onEnter: play,
              onEnterBack: play,
              onLeave: reset,
              onLeaveBack: reset,
            });
          });
        };

        gsap.utils.toArray<HTMLElement>('[data-reveal="up"][data-once]', root).forEach((el, i) => {
          gsap.fromTo(el, { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: 1, ease: "power3.out", delay: 1 + i * 0.1, clearProps: "transform" });
        });
        batchOf(
          '[data-reveal="up"]:not([data-once])',
          { opacity: 0, y: 44 },
          { opacity: 1, y: 0, duration: 1, ease: "power3.out", stagger: 0.1, clearProps: "transform" },
        );
        batchOf(
          '[data-reveal="card"]',
          { opacity: 0, y: 70, rotationX: -18, scale: 0.94, transformPerspective: 900, transformOrigin: "50% 100%" },
          { opacity: 1, y: 0, rotationX: 0, scale: 1, duration: 1.2, ease: "expo.out", stagger: 0.12, clearProps: "transform" },
        );
        batchOf(
          '[data-reveal="clip"]',
          { opacity: 1, clipPath: "inset(100% 0 0 0)", y: 30 },
          { clipPath: "inset(0% 0 0 0)", y: 0, duration: 1.25, ease: "expo.inOut", stagger: 0.1, clearProps: "clipPath,transform" },
        );
        batchOf(
          '[data-reveal="pop"]',
          { opacity: 0, scale: 0.6 },
          { opacity: 1, scale: 1, duration: 0.9, ease: "back.out(2)", stagger: 0.08, clearProps: "transform" },
        );

        // ── clip-card images settle from a zoom as they're revealed
        gsap.utils.toArray<HTMLElement>('[data-reveal="clip"] [data-zoom]', root).forEach((img) => {
          gsap.set(img, { scale: 1.35 });
          ScrollTrigger.create({
            trigger: img.closest("[data-reveal]") as HTMLElement,
            start: "top 90%",
            end: "bottom top",
            onEnter: () => gsap.to(img, { scale: 1, duration: 1.8, ease: "expo.out", delay: 0.1, overwrite: true }),
            onEnterBack: () => gsap.to(img, { scale: 1, duration: 1.8, ease: "expo.out", delay: 0.1, overwrite: true }),
            onLeave: () => gsap.set(img, { scale: 1.35 }),
            onLeaveBack: () => gsap.set(img, { scale: 1.35 }),
          });
        });

        // ── parallax: image slides inside its frame as the page scrolls
        gsap.utils.toArray<HTMLElement>("[data-parallax]", root).forEach((img) => {
          gsap.fromTo(
            img,
            { yPercent: -7 },
            {
              yPercent: 7,
              ease: "none",
              scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: 0.6 },
            },
          );
        });

        // ── decorative drifting shapes
        gsap.utils.toArray<HTMLElement>("[data-drift]", root).forEach((el) => {
          const k = Number(el.dataset.drift) || 1;
          gsap.to(el, {
            y: -90 * k,
            rotate: 25 * k,
            ease: "none",
            scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: 1 },
          });
        });

        return () => cleanups.forEach((fn) => fn());
      });

      // ── hover tilt (pointer devices only)
      mm.add(`${MOTION_OK} and (hover: hover)`, () => {
        const cleanups: (() => void)[] = [];
        root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
          const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3.out" });
          const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" });
          const move = (e: MouseEvent) => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            ry(x * 9);
            rx(-y * 9);
          };
          const leave = () => {
            rx(0);
            ry(0);
          };
          card.addEventListener("mousemove", move);
          card.addEventListener("mouseleave", leave);
          cleanups.push(() => {
            card.removeEventListener("mousemove", move);
            card.removeEventListener("mouseleave", leave);
          });
        });
        return () => cleanups.forEach((fn) => fn());
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} data-reveal-group className={className}>
      {children}
    </div>
  );
}

/** Wrap every word in a masked inline-block, keeping inner elements (spans with colour classes) intact. */
function splitWords(root: HTMLElement) {
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (!text.trim()) return;
      const frag = document.createDocumentFragment();
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(" "));
          return;
        }
        const mask = document.createElement("span");
        mask.className = "sw";
        mask.style.cssText = "display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:0.14em;margin-bottom:-0.14em";
        const inner = document.createElement("span");
        inner.className = "sw-i";
        inner.style.cssText = "display:inline-block;will-change:transform";
        inner.textContent = part;
        mask.appendChild(inner);
        frag.appendChild(mask);
      });
      node.parentNode?.replaceChild(frag, node);
    } else {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  Array.from(root.childNodes).forEach(walk);
}
