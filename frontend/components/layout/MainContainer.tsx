"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

export default function MainContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mountedPath, setMountedPath] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMountedPath(window.location.pathname);
    }
  }, [pathname]);

  const activePath = mountedPath ?? pathname;
  const isHome =
    !activePath ||
    activePath === "/" ||
    activePath === "" ||
    activePath.split(/[?#]/)[0].replace(/\/+$/, "") === "";

  return (
    <main className={`flex-1 ${isHome ? "pt-0" : "pt-16 sm:pt-20"}`}>
      {children}
    </main>
  );
}
