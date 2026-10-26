"use client";

import React from "react";
import { motion } from "framer-motion";

interface BlobProps {
  theme: {
    from: string;
    to: string;
    glow?: string;
  };
}

// 3 organic shapes with a broad, spacious right dome ensuring the full name sits inside
const PATH_1 =
  "M 320,60 C 580,20 860,30 1000,160 C 1090,260 1090,560 1000,660 C 880,780 580,800 360,750 C 180,700 80,570 70,410 C 60,240 150,95 320,60 Z";

const PATH_2 =
  "M 340,45 C 600,25 880,40 1010,180 C 1095,280 1085,570 990,675 C 870,790 560,790 340,735 C 160,675 85,530 75,380 C 65,220 160,70 340,45 Z";

const PATH_3 =
  "M 300,75 C 560,25 840,35 990,170 C 1085,270 1090,550 995,650 C 875,770 590,805 380,760 C 195,710 85,580 75,430 C 65,260 140,115 300,75 Z";

export const Blob: React.FC<BlobProps> = ({ theme }) => {
  return (
    <div
      aria-hidden="true"
      className="absolute -right-8 sm:-right-4 lg:right-0 xl:right-4 top-1/2 -translate-y-1/2 w-[680px] sm:w-[820px] md:w-[940px] lg:w-[1040px] xl:w-[1140px] h-[92%] sm:h-[96%] pointer-events-none select-none z-10"
    >
      <motion.svg
        viewBox="0 0 1100 820"
        className="w-full h-full filter drop-shadow-[0_24px_55px_rgba(0,0,0,0.13)]"
        animate={{
          scale: [1, 1.025, 0.985, 1],
          rotate: [0, 1.2, -1, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <defs>
          <linearGradient id="hero-blob-gradient" x1="12%" y1="5%" x2="88%" y2="95%">
            <stop
              offset="0%"
              stopColor={theme.from}
              style={{
                transition: "stop-color 700ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
            <stop
              offset="100%"
              stopColor={theme.to}
              style={{
                transition: "stop-color 700ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            />
          </linearGradient>

          {/* Ambient soft highlight for glossy depth */}
          <radialGradient id="hero-blob-highlight" cx="35%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Main organic colored shape */}
        <motion.path
          fill="url(#hero-blob-gradient)"
          animate={{
            d: [PATH_1, PATH_2, PATH_3, PATH_1],
          }}
          transition={{
            duration: 9.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Soft luxury highlight overlay */}
        <motion.path
          fill="url(#hero-blob-highlight)"
          animate={{
            d: [PATH_1, PATH_2, PATH_3, PATH_1],
          }}
          transition={{
            duration: 9.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.svg>
    </div>
  );
};
