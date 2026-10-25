import ComparePage from "@/components/compare/ComparePage";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Compare dresses",
  description: "Compare up to three dresses side by side: fabric, style, ratings and specifications.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComparePage />
    </Suspense>
  );
}
