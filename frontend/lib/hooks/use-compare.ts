"use client";

import { CompareContext } from "@/lib/context/CompareContext";
import type { CompareContextValue } from "@/lib/types";
import { useContext } from "react";

/**
 * Convenience hook for consuming CompareContext.
 * Must be used inside <CompareProvider>.
 */
export function useCompare(): CompareContextValue {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
}
