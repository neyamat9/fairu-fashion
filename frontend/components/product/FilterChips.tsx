"use client";

export interface ActiveFilter {
  /** Unique key for this filter chip (e.g. "brand:asus", "category:laptops", "price", "inStock") */
  key: string;
  /** Human-readable label shown in the chip */
  label: string;
}

interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
}

/**
 * FilterChips — displays active filter tags with × remove buttons.
 * Each chip animates in with scaleIn and out with a CSS transition.
 */
export default function FilterChips({ filters, onRemove, onClearAll }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label="Active filters"
    >
      {filters.map((filter) => (
        <Chip key={filter.key} filter={filter} onRemove={onRemove} />
      ))}

      {filters.length > 1 && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 hover:text-accent-text transition-colors px-2 py-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

function Chip({
  filter,
  onRemove,
}: {
  filter: ActiveFilter;
  onRemove: (key: string) => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-orange/10 border border-brand-orange/30 rounded text-[11px] font-bold text-accent-text animate-scale-in"
    >
      {filter.label}
      <button
        type="button"
        onClick={() => onRemove(filter.key)}
        aria-label={`Remove filter: ${filter.label}`}
        className="w-4 h-4 flex items-center justify-center rounded hover:bg-brand-orange/20 transition-colors flex-shrink-0"
      >
        <svg
          className="w-2.5 h-2.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </span>
  );
}
