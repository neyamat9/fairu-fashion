"use client";

import type { Product } from "@/lib/types";
import { useCallback } from "react";
import { useLocalStorage } from "./use-local-storage";

const STORAGE_KEY = "raizbd_recently_viewed";
const MAX_ITEMS = 4;

export interface RecentlyViewedItem {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  categoryName: string;
}

export interface UseRecentlyViewedResult {
  /** Last 4 distinct products visited, most recent first. */
  recentlyViewed: RecentlyViewedItem[];
  /**
   * Call this on every Product_Detail_Page mount.
   * Adds the product to the front of the list, removes any duplicate,
   * and trims to MAX_ITEMS.
   */
  addToRecentlyViewed: (product: Product) => void;
  /** Clear the entire recently-viewed list. */
  clearRecentlyViewed: () => void;
}

/**
 * Manages the `raizbd_recently_viewed` localStorage key.
 * - Max 4 items
 * - Deduplicates by product id (most recent visit wins position 0)
 * - Persists across page reloads
 */
export function useRecentlyViewed(): UseRecentlyViewedResult {
  const [recentlyViewed, setRecentlyViewed, clearRecentlyViewed] =
    useLocalStorage<RecentlyViewedItem[]>(STORAGE_KEY, []);

  const addToRecentlyViewed = useCallback(
    (product: Product) => {
      const item: RecentlyViewedItem = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        imageUrl:
          product.images.find((img) => img.isPrimary)?.url ??
          product.images[0]?.url ??
          `https://picsum.photos/seed/${product.id}/400/400`,
        categoryName: product.categoryName,
      };

      setRecentlyViewed((prev) => {
        // Remove any existing entry for this product
        const filtered = prev.filter((p) => p.id !== item.id);
        // Prepend and cap at MAX_ITEMS
        return [item, ...filtered].slice(0, MAX_ITEMS);
      });
    },
    [setRecentlyViewed]
  );

  return {
    recentlyViewed,
    addToRecentlyViewed,
    clearRecentlyViewed,
  };
}
