"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle, ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  id: string;
  name: string;
  location: string;
  avatarText: string;
  rating: number;
  productBought: string;
  text: string;
  date: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Tasneem Rahman",
    location: "Gulshan, Dhaka",
    avatarText: "TR",
    rating: 5,
    productBought: "Zamzam Royal Three Piece",
    text: "The embroidery and fabric weight were beyond breathtaking. The zari thread work has an authentic royal finish that felt so comfortable all day.",
    date: "2 days ago",
  },
  {
    id: "2",
    name: "Nusrat Jahan",
    location: "Nasirabad, Chittagong",
    avatarText: "NJ",
    rating: 5,
    productBought: "Bin Hamid Luxury Lawn",
    text: "Fairu Fashion has become my primary boutique for ethnic wear. The stitching precision is impeccable and delivery to Chittagong was super prompt.",
    date: "1 week ago",
  },
  {
    id: "3",
    name: "Farzana Ahmed",
    location: "Uttara, Dhaka",
    avatarText: "FA",
    rating: 5,
    productBought: "Gul Ahmed Mint Silk",
    text: "Pure luxury silk that feels featherlight yet opulent. The exact color matched the photos 100%. Hands down the best online boutique experience in BD.",
    date: "2 weeks ago",
  },
  {
    id: "4",
    name: "Samira Haque",
    location: "Zindabazar, Sylhet",
    avatarText: "SH",
    rating: 5,
    productBought: "Summer Floral Festive",
    text: "Outstanding customer service and genuine luxury fabric. You can immediately notice the hand-crafted touch in the neckline and dupatta tassels.",
    date: "3 weeks ago",
  },
  {
    id: "5",
    name: "Maliha Karim",
    location: "Dhanmondi, Dhaka",
    avatarText: "MK",
    rating: 5,
    productBought: "Fairu Rose Organza Edit",
    text: "Wore this piece to a wedding reception and received compliments all evening! The drape of the organza dupatta is pure elegance.",
    date: "1 month ago",
  },
];

export default function TestimonialsSection() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextTestimonial = () => {
    setActiveIdx((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const prevTestimonial = () => {
    setActiveIdx((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextTestimonial();
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused]);

  const current = TESTIMONIALS[activeIdx];

  return (
    <section
      className="w-full py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background via-[#faf3f6] to-background overflow-hidden select-none"
      aria-labelledby="testimonials-heading"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12 pb-5 border-b border-rose-100/60">
          <div>
            <h2
              id="testimonials-heading"
              className="font-outfit font-light text-2xl sm:text-3xl lg:text-4xl tracking-tight text-neutral-900"
            >
              What Our Patrons <span className="font-semibold text-neutral-950">Say</span>
            </h2>
          </div>

          {/* Aggregate Rating Pill */}
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full border border-neutral-200/80 shadow-sm w-fit">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <span className="font-poppins text-xs font-bold text-neutral-900">4.9 / 5.0</span>
            <span className="text-neutral-400 text-xs">•</span>
            <span className="text-neutral-500 font-poppins text-xs">2,400+ Verified Buyers</span>
          </div>
        </div>

        {/* Testimonial Showcase Card with Framer Motion Animation */}
        <div className="relative rounded-[32px] bg-white p-6 sm:p-10 lg:p-14 border border-rose-100/70 shadow-[0_20px_50px_rgba(200,60,100,0.06)] min-h-[340px] flex flex-col justify-between">
          <Quote className="absolute right-8 top-8 w-16 sm:w-24 h-16 sm:h-24 text-rose-500/10 pointer-events-none" />

          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.38, ease: "easeOut" }}
              className="relative z-10"
            >
              {/* Rating & Purchased item tag */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex text-amber-400">
                  {[...Array(current.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold font-poppins border border-emerald-200/60">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Verified Buyer
                </span>
                <span className="text-xs font-medium text-neutral-500 font-poppins bg-neutral-100/80 px-3 py-1 rounded-full">
                  Purchased: {current.productBought}
                </span>
              </div>

              {/* Quote text */}
              <blockquote className="font-outfit text-xl sm:text-2xl lg:text-3xl font-normal text-neutral-800 leading-relaxed max-w-4xl mb-8">
                “{current.text}”
              </blockquote>

              {/* Author Info */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 text-white font-poppins font-bold text-sm flex items-center justify-center shadow-md">
                  {current.avatarText}
                </div>
                <div>
                  <h3 className="font-poppins font-bold text-neutral-900 text-sm sm:text-base">
                    {current.name}
                  </h3>
                  <p className="text-xs text-neutral-400 font-poppins">
                    {current.location} • {current.date}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Bottom Carousel Controls */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-100 z-10">
            {/* Indicator dots */}
            <div className="flex items-center gap-2">
              {TESTIMONIALS.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeIdx === i ? "w-8 bg-rose-500" : "w-2 bg-neutral-200 hover:bg-neutral-300"
                  }`}
                />
              ))}
            </div>

            {/* Navigation Chevron buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevTestimonial}
                aria-label="Previous testimonial"
                className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-900 text-neutral-700 hover:text-white transition-colors duration-200 flex items-center justify-center shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={nextTestimonial}
                aria-label="Next testimonial"
                className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-900 text-neutral-700 hover:text-white transition-colors duration-200 flex items-center justify-center shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
