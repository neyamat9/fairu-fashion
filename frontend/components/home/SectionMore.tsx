import { ArrowRight } from "lucide-react";
import Link from "next/link";

/** Look shared by the "View all …" buttons that close every home section. */
export const sectionMoreClass =
  "group inline-flex w-full items-center justify-center gap-2 rounded border border-border bg-card px-6 py-3.5 text-sm font-bold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text sm:w-fit";

/**
 * The button under a home section's content. Small screens only (from md up the same button lives in the section header).
 * Pass `href` for a link, or `children` with a custom trigger (e.g. the modal buttons) wrapped by the caller.
 */
export default function SectionMore({ href, label, children }: { href?: string; label?: string; children?: React.ReactNode }) {
  return (
    <div data-reveal="up" className="mt-8 flex justify-center md:hidden">
      {href ? (
        <Link href={href} className={sectionMoreClass}>
          {label ?? "View all"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      ) : (
        children
      )}
    </div>
  );
}
