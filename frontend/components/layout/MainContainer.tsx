"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { isHomePage } from "@/lib/utils";

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = isHomePage(pathname);

  return (
    <main className={`flex-1 ${isHome ? "pt-0" : "pt-16 sm:pt-20"}`}>
      {children}
    </main>
  );
}
