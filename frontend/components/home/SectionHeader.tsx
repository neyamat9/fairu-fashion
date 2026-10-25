import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface SectionHeaderProps {
  title: React.ReactNode;
  description?: string;
  href?: string;
  hrefLabel?: string;
  /** Play the header animation once at page load instead of every time it scrolls into view */
  once?: boolean;
  /** A custom trigger (e.g. a button that opens a modal) shown instead of the link */
  action?: React.ReactNode;
}

export default function SectionHeader({ title, description, href, hrefLabel, once, action }: SectionHeaderProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 md:mb-12 md:flex-row md:items-end">
      <div className="max-w-2xl">
        <h2
          data-split
          {...(once ? { "data-once": "" } : {})}
          className="font-outfit text-[1.7rem] font-extrabold leading-[1.1] tracking-tight text-primary dark:text-foreground sm:text-3xl md:text-5xl"
        >
          {title}
        </h2>
        <span data-bar {...(once ? { "data-once": "" } : {})} className="mt-4 block h-1 w-20 bg-brand-orange" aria-hidden="true" />
        {description && (
          <p data-reveal="up" {...(once ? { "data-once": "" } : {})} className="mt-4 text-base leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action ? (
        <div data-reveal="up" {...(once ? { "data-once": "" } : {})} className="shrink-0 max-md:hidden">
          {action}
        </div>
      ) : href && (
        <Link
          data-reveal="up"
          {...(once ? { "data-once": "" } : {})}
          href={href}
          className="group inline-flex w-fit shrink-0 max-md:hidden items-center gap-2 rounded border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text"
        >
          {hrefLabel ?? "View all"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
