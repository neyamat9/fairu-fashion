"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

interface CloudsProps {
  shiftOffset?: number; // drift sideways on product transition
  isReducedMotion?: boolean;
}

export const Clouds: React.FC<CloudsProps> = ({
  shiftOffset = 0,
  isReducedMotion = false,
}) => {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none z-25 overflow-visible"
    >
      {/* Top Cloud: situated above the title, partly overlapping blob top edge */}
      <motion.div
        className="absolute right-[8%] sm:right-[12%] -top-[12%] sm:-top-[16%] w-[170px] sm:w-[220px] lg:w-[260px] aspect-[3/2] filter drop-shadow-[0_16px_28px_rgba(0,0,0,0.14)]"
        animate={
          isReducedMotion
            ? { x: shiftOffset * 0.7 }
            : {
                y: [-7, 7, -7],
                rotate: [-1, 1.2, -1],
                x: shiftOffset * 0.7,
              }
        }
        transition={{
          y: { duration: 5.2, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 0.8, ease: "easeOut" },
        }}
      >
        <Image
          src="/clouds/cloud-2.webp"
          alt=""
          fill
          sizes="(max-width: 768px) 220px, 260px"
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Bottom Cloud: situated below search pill, partly overlapping bottom-right blob edge */}
      <motion.div
        className="absolute right-[-4%] sm:right-[2%] -bottom-[12%] sm:-bottom-[16%] w-[200px] sm:w-[260px] lg:w-[300px] aspect-[4/3] filter drop-shadow-[0_18px_32px_rgba(0,0,0,0.15)]"
        animate={
          isReducedMotion
            ? { x: -shiftOffset * 0.8 }
            : {
                y: [8, -8, 8],
                rotate: [1, -1.2, 1],
                x: -shiftOffset * 0.8,
              }
        }
        transition={{
          y: { duration: 5.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
          rotate: { duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 },
          x: { duration: 0.8, ease: "easeOut" },
        }}
      >
        <Image
          src="/clouds/cloud-1.webp"
          alt=""
          fill
          sizes="(max-width: 768px) 260px, 300px"
          className="object-contain"
          priority
        />
      </motion.div>
    </div>
  );
};
