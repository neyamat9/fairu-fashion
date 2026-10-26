"use client";

import React, { useState, useEffect, useRef } from "react";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import RevealGroup from "@/components/motion/RevealGroup";

interface Testimonial {
  id: string;
  name: string;
  location: string;
  avatarText: string;
  rating: number;
  headline: string;
  quote: string;
  date: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Tasneem Rahman",
    location: "Gulshan, Dhaka",
    avatarText: "TR",
    rating: 5,
    headline: "Breathtaking Zari Embroidery & Regal Draping",
    quote:
      "The embroidery and fabric weight were beyond breathtaking. The zari thread work has an authentic royal finish that felt so comfortable all day at my cousin's Holud. Everyone kept asking where I bought it!",
    date: "2 days ago",
  },
  {
    id: "2",
    name: "Nusrat Jahan",
    location: "Nasirabad, Chittagong",
    avatarText: "NJ",
    rating: 5,
    headline: "Unmatched Fabric Drape & Prompt Delivery",
    quote:
      "Fairu Fashion has become my primary boutique for Pakistani luxury lawn. The stitching precision is impeccable and delivery to Chittagong was super prompt with lovely boutique packaging.",
    date: "4 days ago",
  },
  {
    id: "3",
    name: "Farzana Ahmed",
    location: "Uttara, Dhaka",
    avatarText: "FA",
    rating: 5,
    headline: "Pure Opulent Silk Matching Photos 100%",
    quote:
      "Pure luxury silk that feels featherlight yet opulent. The exact emerald-mint color matched the photos 100%. Hands down the most trustworthy online boutique experience in Bangladesh.",
    date: "1 week ago",
  },
  {
    id: "4",
    name: "Samira Haque",
    location: "Zindabazar, Sylhet",
    avatarText: "SH",
    rating: 5,
    headline: "Exceptional Neckline & Dupatta Details",
    quote:
      "Outstanding customer service and genuine luxury fabric. You can immediately notice the hand-crafted touch in the neckline and dupatta tassels. Will definitely order again!",
    date: "2 weeks ago",
  },
  {
    id: "5",
    name: "Maliha Karim",
    location: "Dhanmondi, Dhaka",
    avatarText: "MK",
    rating: 5,
    headline: "Turned Heads at the Wedding Reception",
    quote:
      "Wore this piece to a high-profile wedding reception and received compliments all evening! The drape of the organza dupatta and the subtle shimmer is pure elegance.",
    date: "3 weeks ago",
  },
  {
    id: "6",
    name: "Ayesha Siddiqua",
    location: "Banani, Dhaka",
    avatarText: "AS",
    rating: 5,
    headline: "Flawless Fit & Authentic Pakistani Fabric",
    quote:
      "I was hesitant about ordering unstitched suits online, but the fabric length was generous, the motifs are flawless, and customer support was so helpful with tailoring guidance.",
    date: "1 month ago",
  },
];

// Tripled list for a seamless, continuous infinite loop without any edge jumps
const INFINITE_ITEMS = [...TESTIMONIALS, ...TESTIMONIALS, ...TESTIMONIALS];
const BASE_COUNT = TESTIMONIALS.length;
const GAP_PX = 20;

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(BASE_COUNT);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);

  // Real-time drag state for instant mouse/touch sliding
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isPointerDown = useRef(false);
  const startX = useRef(0);
  const currentDragDelta = useRef(0);

  // Responsive visible count tracking (3 on desktop, 2 on tablet, 1 on mobile)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setVisibleCount(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Seamless infinite wrap-around on boundary transition completion
  const handleTransitionEnd = () => {
    if (currentIndex >= 2 * BASE_COUNT) {
      setIsTransitioning(false);
      setCurrentIndex((prev) => prev - BASE_COUNT);
    } else if (currentIndex < BASE_COUNT) {
      setIsTransitioning(false);
      setCurrentIndex((prev) => prev + BASE_COUNT);
    }
  };

  // Re-enable smooth transition on the next animation frame after silent index reset
  useEffect(() => {
    if (!isTransitioning) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isTransitioning]);

  const handleNext = () => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev - 1);
  };

  // Auto-advance every 5 seconds (paused when user hovers or drags)
  useEffect(() => {
    if (isPaused || isDragging) return;
    const timer = setInterval(() => {
      handleNext();
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, isDragging]);

  // Real-time mouse and touch dragging handlers (slides INSTANTLY while pressing mouse)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPointerDown.current = true;
    startX.current = e.clientX;
    currentDragDelta.current = 0;
    setIsDragging(true);
    setIsTransitioning(false); // Disable transition for 1:1 real-time cursor tracking
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    const delta = e.clientX - startX.current;
    currentDragDelta.current = delta;
    setDragOffset(delta); // Updates the slider position INSTANTLY with zero lag
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isPointerDown.current) return;
    isPointerDown.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const threshold = 40;
    setIsTransitioning(true); // Re-enable smooth transition for the snap
    setDragOffset(0);

    if (currentDragDelta.current < -threshold) {
      handleNext();
    } else if (currentDragDelta.current > threshold) {
      handlePrev();
    }

    currentDragDelta.current = 0;
    setTimeout(() => setIsDragging(false), 50);
  };

  // Optional mouse wheel horizontal swipe support
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 30) {
      if (e.deltaX > 0) handleNext();
      else handlePrev();
    }
  };

  return (
    <section
      className="overflow-x-clip bg-secondary/35 pb-14 pt-[54px] sm:pt-[64px] md:pb-18 border-t border-border/40 select-none"
      aria-labelledby="testimonials-heading"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onWheel={onWheel}
    >
      <RevealGroup className="relative mx-auto max-w-[1440px] px-4 md:px-8">
        {/* Decorative ambient drift markers */}
        <span
          data-drift="1.4"
          className="pointer-events-none absolute right-0 top-2 hidden h-5 w-5 bg-brand-orange/60 md:block"
          aria-hidden="true"
        />
        <span
          data-drift="0.7"
          className="pointer-events-none absolute right-16 top-20 hidden h-3 w-3 bg-primary/30 md:block"
          aria-hidden="true"
        />

        {/* Section Header with Left Titles & Right Slide Arrows */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-7 sm:mb-8">
          <div className="max-w-2xl">
            <h2
              id="testimonials-heading"
              className="font-outfit text-[1.65rem] font-extrabold leading-[1.1] tracking-tight text-primary dark:text-foreground sm:text-3xl md:text-4xl"
            >
              Loved by <span className="text-brand-orange">thousands</span> of women
            </h2>
            <span className="mt-3.5 block h-1 w-16 bg-brand-orange" aria-hidden="true" />
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground">
              Authentic stories from our patrons across Bangladesh celebrating royal fabrics, flawless stitching, and timeless silhouettes.
            </p>
          </div>

          {/* Clean Navigation Chevron Buttons on Top Right */}
          <div className="flex items-center gap-2 self-start sm:self-end shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-card border border-border/80 hover:border-brand-orange text-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-[4px] bg-card border border-border/80 hover:border-brand-orange text-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer shadow-xs active:scale-95"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* 
          CONTINUOUS INFINITE 3-CARD CAROUSEL (NO PHOTOS, SMALL COMPACT MODERN CARDS)
          Follows mouse cursor instantly during drag, always showing 3 full cards on desktop.
        */}
        <div
          className="relative w-full overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            onTransitionEnd={handleTransitionEnd}
            className="flex gap-5 will-change-transform"
            style={{
              transform: `translateX(calc(-1 * ${currentIndex} * (100% + ${GAP_PX}px) / ${visibleCount} + ${dragOffset}px))`,
              transition: isTransitioning
                ? "transform 450ms cubic-bezier(0.25, 1, 0.5, 1)"
                : "none",
            }}
          >
            {INFINITE_ITEMS.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="w-full sm:w-[calc(50%-10px)] lg:w-[calc(33.333333%-14px)] shrink-0"
              >
                {/* Small, Sleek, Modern Testimonial Card */}
                <div className="flex flex-col justify-between h-full rounded-[4px] bg-card border border-border/80 shadow-xs hover:shadow-md hover:border-brand-orange/60 transition-all duration-200 p-4 sm:p-5 min-h-[185px]">
                  
                  {/* Top Row: 5 Gold Stars & Relative Date */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-0.5 text-[#f4a2b6]">
                        {[...Array(item.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground/80">
                        {item.date}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3 className="font-outfit font-bold text-sm sm:text-[15px] text-foreground mb-1.5 leading-snug line-clamp-1">
                      &ldquo;{item.headline}&rdquo;
                    </h3>

                    {/* Body Quote */}
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 font-normal">
                      {item.quote}
                    </p>
                  </div>

                  {/* Reviewer Details Footer (No photos, clean avatar initials + name + location) */}
                  <div className="pt-3 mt-3 border-t border-border/50 flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-[4px] bg-gradient-to-tr from-primary to-brand-orange text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                      {item.avatarText}
                    </div>
                    <div className="min-w-0 flex items-center gap-1.5 truncate">
                      <span className="font-bold text-xs text-foreground truncate">
                        {item.name}
                      </span>
                      <span className="text-muted-foreground/60 text-[10px]">•</span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {item.location}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        </div>
      </RevealGroup>
    </section>
  );
}
