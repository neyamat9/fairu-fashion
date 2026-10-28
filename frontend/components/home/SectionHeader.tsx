"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface SectionHeaderProps {
  title: React.ReactNode;
  description?: string;
  href?: string;
  hrefLabel?: string;
  /** Play the header animation once at page load instead of every time it scrolls into view */
  once?: boolean;
  /** A custom trigger (e.g. a button that opens a modal) shown instead of the link */
  action?: React.ReactNode;
  /** Use smooth framer-motion entrance animation instead of GSAP attributes */
  useMotion?: boolean;
}

export default function SectionHeader({
  title,
  description,
  href,
  hrefLabel,
  once,
  action,
  useMotion = false,
}: SectionHeaderProps) {
  if (useMotion) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 flex flex-col justify-between gap-5 md:mb-12 md:flex-row md:items-end"
      >
        <div className="max-w-2xl">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="font-outfit text-[1.7rem] font-extrabold leading-[1.1] tracking-tight text-primary dark:text-foreground sm:text-3xl md:text-5xl"
          >
            {title}
          </motion.h2>
          <motion.span
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 block h-1 w-20 bg-brand-orange origin-left"
            aria-hidden="true"
          />
          {description && (
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 text-base leading-relaxed text-muted-foreground"
            >
              {description}
            </motion.p>
          )}
        </div>
        {action ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 max-md:hidden"
          >
            {action}
          </motion.div>
        ) : href && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 max-md:hidden"
          >
            <Link
              href={href}
              className="group inline-flex w-fit items-center gap-2 rounded border border-border bg-card px-5 py-3 text-sm font-bold text-foreground transition-colors hover:border-brand-orange hover:text-accent-text"
            >
              {hrefLabel ?? "View all"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </motion.div>
        )}
      </motion.div>
    );
  }

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
