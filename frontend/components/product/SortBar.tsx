"use client";

import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowDownUp, Check, ChevronDown, SlidersHorizontal } from "lucide-react";

type SortOption = "popular" | "newest" | "price-asc" | "price-desc" | "rating" | "name";

interface SortBarProps {
  resultCount: number;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  onOpenFilters?: () => void;
  /** How many filters are switched on (shown on the mobile Filters button) */
  activeCount?: number;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "rating", label: "Top Rated" },
];

export default function SortBar({ resultCount, sortBy, onSortChange, onOpenFilters, activeCount = 0 }: SortBarProps) {
  const current = SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded border border-border bg-card px-3 py-2.5 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        {onOpenFilters && (
          <button
            type="button"
            onClick={onOpenFilters}
            className="flex shrink-0 items-center gap-2 rounded bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90 lg:hidden"
            aria-label="Open filters"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
            {activeCount > 0 && <span className="rounded bg-brand-orange px-1.5 py-0.5 text-[10px] leading-none text-on-orange">{activeCount}</span>}
          </button>
        )}
        <p className="truncate text-sm font-medium text-muted-foreground">
          <span className="font-bold text-foreground">{resultCount.toLocaleString()}</span> {resultCount === 1 ? "product" : "products"} found
        </p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Sort products: ${current.label}`}
            className="group flex shrink-0 items-center gap-2 rounded border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-orange focus-visible:border-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/30 data-[state=open]:border-brand-orange"
          >
            <ArrowDownUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="hidden text-muted-foreground sm:inline">Sort by:</span>
            <span>{current.label}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="z-[1100] min-w-56 rounded border border-border bg-popover p-1.5 shadow-xl">
          <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
            {SORT_OPTIONS.map((opt) => (
              <DropdownMenuRadioItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer rounded px-3 py-2.5 pl-3 text-sm font-medium text-foreground focus:bg-accent focus:text-foreground data-[state=checked]:bg-accent data-[state=checked]:font-bold [&>span:first-child]:hidden"
              >
                <span className="flex w-full items-center justify-between gap-3">
                  {opt.label}
                  {opt.value === sortBy && <Check className="h-4 w-4 text-brand-orange" strokeWidth={3} aria-hidden="true" />}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
