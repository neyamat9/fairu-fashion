"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/hooks/use-cart";

interface IncrementNotification {
  id: number;
  countDiff: number;
  amountDiff: number;
}

export default function FloatingCartBadge() {
  const { cartCount, cartTotal, openCart } = useCart();
  const [incrementBubble, setIncrementBubble] = useState<IncrementNotification | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);

  const prevCountRef = useRef(cartCount);
  const prevTotalRef = useRef(cartTotal);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip animation on first mount
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevCountRef.current = cartCount;
      prevTotalRef.current = cartTotal;
      return;
    }

    // Trigger bounce and floating amount increment when items are added
    if (cartCount > prevCountRef.current) {
      const countDiff = cartCount - prevCountRef.current;
      const amountDiff = Math.max(0, cartTotal - prevTotalRef.current);

      setIsPulsing(true);
      const timerPulse = setTimeout(() => setIsPulsing(false), 900);

      setIncrementBubble({
        id: Date.now(),
        countDiff,
        amountDiff,
      });

      const timerBubble = setTimeout(() => {
        setIncrementBubble(null);
      }, 2200);

      prevCountRef.current = cartCount;
      prevTotalRef.current = cartTotal;

      return () => {
        clearTimeout(timerPulse);
        clearTimeout(timerBubble);
      };
    }

    prevCountRef.current = cartCount;
    prevTotalRef.current = cartTotal;
  }, [cartCount, cartTotal]);

  // Only render when cart has products
  if (cartCount <= 0) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 90, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 90, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 26 }}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[1000] select-none"
        aria-label="Floating cart summary"
      >
        {/* Floating animated chip when item is added */}
        <AnimatePresence>
          {incrementBubble && (
            <motion.div
              key={incrementBubble.id}
              initial={{ opacity: 0, y: 0, x: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: -45, x: -16, scale: 1.05 }}
              exit={{ opacity: 0, y: -65, scale: 0.85 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="absolute top-0 left-0 pointer-events-none -translate-x-full bg-[#1F1917]/95 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[11px] font-bold shadow-2xl border border-rose-300/40 whitespace-nowrap flex items-center gap-1.5 z-50"
            >
              <span className="text-rose-400">+{incrementBubble.countDiff} item</span>
              <span className="text-white/40">•</span>
              <span className="text-[#FFE873]">
                +৳{incrementBubble.amountDiff > 0 ? incrementBubble.amountDiff.toLocaleString("en-BD") : "Added"}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Cart Pill Button */}
        <motion.button
          type="button"
          onClick={openCart}
          whileHover={{ scale: 1.05, x: -4 }}
          whileTap={{ scale: 0.94 }}
          animate={isPulsing ? { scale: [1, 1.15, 0.96, 1.06, 1] } : {}}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          aria-label={`Open shopping cart with ${cartCount} items totaling ৳${cartTotal.toLocaleString("en-BD")}`}
          className="relative flex flex-col items-center justify-center py-3.5 px-2.5 sm:px-3 rounded-l-2xl bg-gradient-to-b from-[#9E596B] to-[#7F384B] text-white shadow-[0_10px_35px_rgba(158,89,107,0.48)] hover:shadow-[0_14px_45px_rgba(158,89,107,0.65)] border-y border-l border-white/30 cursor-pointer transition-shadow"
        >
          {/* Subtle ring pulse effect */}
          {isPulsing && (
            <span className="absolute inset-0 rounded-l-2xl border-2 border-white/60 animate-ping pointer-events-none" />
          )}

          {/* Top: Cart Icon */}
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-white stroke-[1.9]" />
          </div>

          {/* Count Badge with bouncy entrance */}
          <motion.span
            key={`count-${cartCount}`}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 450, damping: 14 }}
            className="mt-1.5 min-w-[22px] h-[20px] px-1.5 rounded-full bg-white text-[#9E596B] font-extrabold text-[11px] flex items-center justify-center shadow-md leading-none"
          >
            {cartCount}
          </motion.span>

          {/* Divider */}
          <div className="w-6 h-[1px] bg-white/30 my-2" />

          {/* Bottom: Total Amount in BDT */}
          <div className="flex flex-col items-center text-center">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-white/75 leading-none">
              Total
            </span>
            <motion.div
              key={`total-${cartTotal}`}
              initial={{ scale: 1.35, color: "#FFE873" }}
              animate={{ scale: 1, color: "#FFFFFF" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-center gap-0.5 mt-1 font-mono text-xs sm:text-[13px] font-black text-white leading-none tracking-tight whitespace-nowrap"
            >
              <span className="text-[10px] text-white/80">৳</span>
              <span>{cartTotal.toLocaleString("en-BD")}</span>
            </motion.div>
          </div>
        </motion.button>
      </motion.aside>
    </AnimatePresence>
  );
}
