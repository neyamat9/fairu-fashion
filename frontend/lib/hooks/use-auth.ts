"use client";

import { AuthContext } from "@/lib/context/AuthContext";
import type { AuthContextValue } from "@/lib/types";
import { useContext } from "react";

/**
 * Convenience hook for consuming AuthContext.
 * Must be used inside <AuthProvider>.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
