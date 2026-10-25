const bar = "animate-pulse rounded bg-secondary";

/** Placeholder shaped like the compare page: heading, search box, three product cards and a few spec rows. */
export default function CompareSkeleton() {
  return (
    <section className="bg-background" aria-busy="true" aria-label="Loading">
      <div className="mx-auto max-w-[1440px] px-3 py-6 sm:px-6 md:py-10 lg:px-8">
        <div className="mb-5">
          <div className={`${bar} h-10 w-72 max-w-full`} />
          <div className={`${bar} mt-2.5 h-4 w-64 max-w-full`} />
        </div>
        <div className="mb-6 rounded border border-border bg-card p-3 sm:p-4">
          <div className={`${bar} mb-2 h-4 w-56`} />
          <div className={`${bar} h-12 w-full`} />
        </div>
        <div className="grid grid-cols-3 gap-x-2 sm:gap-x-3 md:gap-x-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="mx-auto w-full max-w-[19rem] rounded border border-border bg-card p-2 sm:p-3">
              <div className={`${bar} aspect-square w-full`} />
              <div className={`${bar} mt-3 h-3 w-4/5`} />
              <div className={`${bar} mt-2 h-3 w-3/5`} />
              <div className={`${bar} mt-3 h-9 w-full`} />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${bar} h-36 w-full`} />
          ))}
        </div>
      </div>
    </section>
  );
}
