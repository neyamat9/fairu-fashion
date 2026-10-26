/**
 * Instant-loading placeholders. Each route's `loading.tsx` renders one of these the moment a link
 * is clicked, so the page shell appears immediately and the real content streams in afterwards.
 */

const bar = "animate-pulse rounded bg-secondary";

function Block({ className = "" }: { className?: string }) {
  return <div className={`${bar} ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded border border-border bg-card">
      <Block className="aspect-square w-full !rounded-none" />
      <div className="space-y-2.5 p-4">
        <Block className="h-3 w-16" />
        <Block className="h-4 w-full" />
        <Block className="h-4 w-2/3" />
        <Block className="h-3 w-24" />
        <div className="flex items-end justify-between pt-3">
          <Block className="h-6 w-20" />
          <Block className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}

export function CardsSkeleton({ count = 8, cols = "grid-cols-2 lg:grid-cols-4" }: { count?: number; cols?: string }) {
  return (
    <div className={`grid gap-3 md:gap-5 ${cols}`} aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Home page: full architectural luxury hero scene, followed by curated categories and product rows */
export function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      {/* 1. Full Architectural Editorial Hero Skeleton */}
      <section className="relative w-full overflow-hidden bg-[#EFE8DF] select-none min-h-[660px] sm:min-h-[740px] lg:min-h-[820px] xl:min-h-[880px] flex flex-col justify-between">
        {/* Soft atmospheric gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F6F1EA]/80 via-[#F6F1EA]/50 to-transparent pointer-events-none lg:w-[65%]" />

        <div className="relative z-20 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex-1 flex flex-col justify-center my-auto pt-28 sm:pt-32 lg:pt-36 pb-12 sm:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-8">
            {/* Left Column: Wall Typography Skeleton */}
            <div className="lg:col-span-7 xl:col-span-6 z-20 flex flex-col justify-center pt-2 sm:pt-4 lg:pt-0 max-w-[620px]">
              {/* Headline Line 1 */}
              <div className="h-10 sm:h-14 lg:h-16 w-3/4 max-w-[440px] rounded-lg bg-[#DACEC0]/70 animate-pulse" />
              {/* Headline Line 2 (Italic Highlight) */}
              <div className="h-10 sm:h-14 lg:h-16 w-3/5 max-w-[320px] rounded-lg bg-[#DACEC0]/50 animate-pulse mt-3 sm:mt-4" />

              {/* Description Paragraph */}
              <div className="space-y-2.5 mt-6 sm:mt-8">
                <div className="h-3.5 sm:h-4 w-full max-w-[460px] rounded bg-[#DACEC0]/60 animate-pulse" />
                <div className="h-3.5 sm:h-4 w-4/5 max-w-[380px] rounded bg-[#DACEC0]/50 animate-pulse" />
              </div>

              {/* CTA Button Skeleton */}
              <div className="h-12 sm:h-14 w-36 sm:w-40 rounded-md bg-[#9E596B]/30 animate-pulse mt-8 sm:mt-10" />
            </div>

            {/* Right Column: Architectural Archway Silhouette Placeholder */}
            <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 items-center justify-end pointer-events-none">
              <div className="w-[340px] xl:w-[420px] h-[500px] xl:h-[600px] rounded-t-full bg-[#E5DCD0]/60 animate-pulse border-8 border-white/40 shadow-inner flex items-center justify-center">
                <div className="w-2/3 h-3/4 rounded-t-full bg-[#DACEC0]/40 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Subtle bottom spacer */}
        <div className="h-4 sm:h-6 pointer-events-none" />
      </section>
      <section className="bg-secondary/60 py-16 md:py-20">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <Block className="mb-3 h-10 w-80 max-w-full" />
          <Block className="mb-10 h-1 w-20 !bg-brand-orange/50" />
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Block key={i} className="aspect-[5/4] !bg-card" />
            ))}
          </div>
        </div>
      </section>
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-[1440px] px-4 md:px-8">
          <Block className="mb-10 h-10 w-72 max-w-full" />
          <CardsSkeleton count={4} />
        </div>
      </section>
    </div>
  );
}

/** Product / category / brand / search listings: heading, filter sidebar, product grid */
export function ListingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1440px] px-4 py-10 md:px-8">
        <div className="mb-8 space-y-3">
          <Block className="h-10 w-72 max-w-full md:h-12" />
          <Block className="h-4 w-44" />
        </div>
        <div className="flex items-start gap-8">
          <div className="hidden w-64 shrink-0 space-y-6 rounded border border-border bg-muted p-6 lg:block">
            <Block className="h-4 w-24 !bg-card" />
            <Block className="h-6 w-full !bg-card" />
            <Block className="h-16 w-full !bg-card" />
            {Array.from({ length: 7 }).map((_, i) => (
              <Block key={i} className="h-4 w-4/5 !bg-card" />
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <Block className="mb-5 h-12 w-full" />
            <CardsSkeleton count={12} cols="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Product details: related list on the left, product card, tabs */
export function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading product">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-5">
          <div className="rounded border border-border bg-card p-4 sm:p-6">
            <div className="grid gap-6 md:grid-cols-[minmax(0,460px)_minmax(0,1fr)] md:gap-8 lg:gap-12">
              <div>
                <Block className="aspect-square w-full" />
                <div className="mt-3 flex gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Block key={i} className="h-16 w-16" />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <Block className="h-7 w-11/12" />
                <Block className="h-7 w-2/3" />
                <Block className="h-5 w-56" />
                <div className="flex flex-wrap gap-2">
                  <Block className="h-8 w-28" />
                  <Block className="h-8 w-24" />
                  <Block className="h-8 w-28" />
                </div>
                <Block className="h-4 w-full" />
                <Block className="h-4 w-4/5" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Block className="h-28" />
                  <Block className="h-28" />
                </div>
                <div className="flex gap-2.5">
                  <Block className="h-11 w-32" />
                  <Block className="h-11 flex-1" />
                  <Block className="h-11 w-28" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded border border-border bg-card">
              <div className="flex gap-6 border-b border-border px-6 py-4">
                <Block className="h-5 w-24" />
                <Block className="h-5 w-24" />
                <Block className="h-5 w-24" />
              </div>
              <div className="space-y-3 p-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Block key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
            <div className="hidden overflow-hidden rounded border border-border bg-card lg:block">
              <div className="border-b border-border px-5 py-4">
                <Block className="h-5 w-36" />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3.5 border-b border-border/70 px-5 py-4 last:border-b-0">
                  <Block className="h-16 w-16 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Block className="h-3.5 w-full" />
                    <Block className="h-3.5 w-3/4" />
                    <Block className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Simple centred skeleton for forms, account and checkout pages */
export function GenericSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-12 sm:px-6" aria-busy="true" aria-label="Loading">
      <Block className="h-10 w-64" />
      <Block className="h-4 w-80 max-w-full" />
      <Block className="h-48 w-full" />
      <Block className="h-48 w-full" />
    </div>
  );
}
