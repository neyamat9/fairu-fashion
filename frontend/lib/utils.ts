import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Bulletproof check whether a given pathname represents the storefront homepage.
 * Gracefully handles SSR null states, trailing slashes, route groups (e.g. /(landing)),
 * query parameters, and index suffixes.
 */
export function isHomePage(pathname: string | null | undefined): boolean {
  if (!pathname) return true;
  const clean = pathname
    .replace(/\/\([^)]+\)/g, "")
    .split(/[?#]/)[0]
    .replace(/\/+$/, "")
    .toLowerCase();

  if (
    clean === "" ||
    clean === "/" ||
    clean === "/index" ||
    clean === "/index.html"
  ) {
    return true;
  }

  // Known sub-routes that are NOT the homepage
  const nonHomePrefixes = [
    "/products",
    "/contact",
    "/category",
    "/brand",
    "/orders",
    "/account",
    "/cart",
    "/checkout",
    "/search",
    "/returns-policy",
    "/track-order",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/api",
  ];

  if (nonHomePrefixes.some((prefix) => clean === prefix || clean.startsWith(prefix + "/"))) {
    return false;
  }

  return true;
}
