import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A row of chips that scrolls sideways every way a person might try:
 *  - ‹ › buttons appear on whichever side has more to show (hidden on touch screens, where you just swipe)
 *  - mouse wheel and trackpad scroll it, a mouse can also drag it
 *  - a soft fade marks the side that is cut off, and the last chip always has room (never clipped)
 *  - the chip marked with data-active scrolls into view by itself
 */
export function ScrollRow({ children, className, activeKey }: { children: ReactNode; className?: string; activeKey?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ left: false, right: false });
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const measure = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setEdge((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);
    // the wheel scrolls the row sideways while there is room that way; otherwise the page scrolls as usual
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // already a sideways gesture
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      const next = el.scrollLeft + e.deltaY;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max)) return;
      e.preventDefault();
      el.scrollLeft = Math.max(0, Math.min(max, next));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [measure]);

  // bring the selected chip into view
  useEffect(() => {
    const el = box.current;
    const on = el?.querySelector<HTMLElement>("[data-active='true']");
    if (!el || !on) return;
    const l = on.offsetLeft - 40;
    const r = on.offsetLeft + on.offsetWidth + 40;
    if (l < el.scrollLeft) el.scrollTo({ left: Math.max(0, l), behavior: "smooth" });
    else if (r > el.scrollLeft + el.clientWidth) el.scrollTo({ left: r - el.clientWidth, behavior: "smooth" });
  }, [activeKey]);

  const nudge = (dir: -1 | 1) => box.current?.scrollBy({ left: dir * Math.max(160, box.current.clientWidth * 0.7), behavior: "smooth" });

  return (
    <div className={cn("relative", className)}>
      <div
        ref={box}
        onScroll={measure}
        onPointerDown={(e) => {
          if (e.pointerType !== "mouse" || e.button !== 0 || !box.current) return;
          drag.current = { x: e.clientX, left: box.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !box.current) return;
          const dx = e.clientX - d.x;
          if (!d.moved && Math.abs(dx) > 5) {
            d.moved = true;
            box.current.setPointerCapture(e.pointerId);
          }
          if (d.moved) box.current.scrollLeft = d.left - dx;
        }}
        onPointerUp={() => {
          // a drag must not also "click" the chip under the pointer
          const moved = drag.current?.moved;
          drag.current = null;
          if (moved) window.addEventListener("click", (ev) => ev.stopPropagation(), { capture: true, once: true });
        }}
        className="no-scrollbar flex cursor-grab touch-pan-x gap-1.5 overflow-x-auto scroll-smooth py-1 active:cursor-grabbing [&>*]:shrink-0 after:block after:w-6 after:shrink-0 after:content-['']"
      >
        {children}
      </div>

      {/* fades + buttons */}
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-card to-transparent transition-opacity", edge.left ? "opacity-100" : "opacity-0")} />
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-card to-transparent transition-opacity", edge.right ? "opacity-100" : "opacity-0")} />
      {(["left", "right"] as const).map((side) => {
        const show = side === "left" ? edge.left : edge.right;
        const Icon = side === "left" ? ChevronLeft : ChevronRight;
        return (
          <button
            key={side}
            type="button"
            tabIndex={show ? 0 : -1}
            aria-label={side === "left" ? "Scroll left" : "Scroll right"}
            onClick={() => nudge(side === "left" ? -1 : 1)}
            className={cn(
              "absolute top-1/2 hidden size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded border border-border bg-card text-foreground shadow-md transition-all hover:border-ring hover:bg-muted [@media(hover:hover)]:flex",
              side === "left" ? "left-0.5" : "right-0.5",
              show ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
