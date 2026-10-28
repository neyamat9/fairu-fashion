import Link from "next/link";

// Fairu Fashion lockup: the logo mark sits on a white tile (the artwork has a
// white background, so it works in light and dark), with a theme-aware wordmark.
export default function BrandLogo({
  size = "md",
  tagline = false,
  asLink = true,
  tone = "default",
}: {
  size?: "sm" | "md" | "lg" | "xl";
  tagline?: boolean;
  asLink?: boolean;
  /** "onDark" is for surfaces that stay dark in both themes (footer, auth panel) */
  tone?: "default" | "onDark";
}) {
  const dims = {
    sm: { tile: "size-9 p-1", text: "text-lg", tag: "text-[8px]" },
    md: { tile: "size-9 min-[360px]:size-10 p-1 sm:size-11", text: "text-lg min-[360px]:text-xl sm:text-2xl md:text-[26px]", tag: "text-[9px]" },
    lg: { tile: "size-12 p-1.5 sm:size-14", text: "text-2xl sm:text-3xl", tag: "text-[10px]" },
    xl: { tile: "size-16 p-2 sm:size-20", text: "text-4xl sm:text-5xl", tag: "text-xs" },
  }[size];
  const onDark = tone === "onDark";

  const body = (
    <span className="group flex items-center gap-2 min-[360px]:gap-2.5 sm:gap-3">
      <span className={`${dims.tile} flex shrink-0 items-center justify-center rounded border border-border ${onDark ? "bg-white" : "bg-card dark:bg-white"}`}>
        {/* the artwork has a white background: multiply lets it melt into the cream tile in light mode */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.png" alt="Fairu Fashion" className={`size-full object-contain ${onDark ? "" : "mix-blend-multiply dark:mix-blend-normal"}`} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`${dims.text} font-black tracking-tight font-outfit`}>
          <span className={onDark ? "text-white" : "text-primary dark:text-foreground"}>Fairu</span>
          <span className="text-brand-orange ml-1 min-[360px]:ml-1.5">Fashion</span>
        </span>
        {tagline && (
          <span
            className={`${dims.tag} mt-1.5 font-bold uppercase tracking-[0.24em] transition-colors group-hover:text-accent-text ${
              onDark ? "text-white/60" : "text-muted-foreground"
            }`}
          >
            Elegance in Every Stitch
          </span>
        )}
      </span>
    </span>
  );

  return asLink ? (
    <Link href="/" aria-label="Fairu Fashion home" className="inline-flex">
      {body}
    </Link>
  ) : (
    body
  );
}
