"use client";

import Link from "next/link";

interface EmptyStateProps {
  onClearFilters?: () => void;
  hasFilters?: boolean;
}

export default function EmptyState({ onClearFilters, hasFilters = true }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      {/* Icon */}
      <div className="w-24 h-24 rounded bg-muted border border-border flex items-center justify-center mb-8">
        <svg
          className="w-10 h-10 text-muted-foreground/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Heading */}
      <h3 className="text-foreground text-2xl font-black uppercase tracking-tighter font-outfit mb-3">
        No Products Found
      </h3>

      {/* Subtext */}
      <p className="text-muted-foreground/70 text-sm font-medium max-w-xs mb-8 leading-relaxed">
        {hasFilters
          ? "No products match your current filters. Try adjusting or clearing them."
          : "There are no products in this category yet. Check back soon."}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {hasFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded hover:bg-primary/90 transition-colors active:scale-95"
          >
            Clear All Filters
          </button>
        )}
        <Link
          href="/products"
          className="px-6 py-3 bg-muted border border-border text-foreground text-xs font-black uppercase tracking-widest rounded hover:bg-secondary transition-colors"
        >
          Browse All Products
        </Link>
      </div>
    </div>
  );
}
