/**
 * SkeletonGrid — shimmer placeholder cards matching ProductCard dimensions.
 * Shown while the Service Layer resolves product data.
 */
export default function SkeletonGrid({ count = 12 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
      aria-busy="true"
      aria-label="Loading products…"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-muted border border-border rounded p-5 flex flex-col overflow-hidden">
      {/* Image area */}
      <div className="relative h-52 rounded overflow-hidden mb-5 bg-muted">
        <ShimmerBar />
      </div>

      {/* Category label */}
      <div className="relative h-3 w-20 rounded bg-muted mb-3 overflow-hidden">
        <ShimmerBar />
      </div>

      {/* Product name — two lines */}
      <div className="relative h-4 w-full rounded bg-muted mb-2 overflow-hidden">
        <ShimmerBar />
      </div>
      <div className="relative h-4 w-3/4 rounded bg-muted mb-5 overflow-hidden">
        <ShimmerBar />
      </div>

      {/* Pinned spec */}
      <div className="relative h-3 w-1/2 rounded bg-muted mb-6 overflow-hidden">
        <ShimmerBar />
      </div>

      {/* Divider */}
      <div className="border-t border-border pt-4 flex items-center justify-between">
        {/* Price */}
        <div className="relative h-6 w-28 rounded bg-muted overflow-hidden">
          <ShimmerBar />
        </div>
        {/* Add to cart button */}
        <div className="relative w-9 h-9 rounded bg-muted overflow-hidden">
          <ShimmerBar />
        </div>
      </div>
    </div>
  );
}

/** Animated shimmer overlay */
function ShimmerBar() {
  return (
    <div
      className="absolute inset-0 animate-shimmer"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}
