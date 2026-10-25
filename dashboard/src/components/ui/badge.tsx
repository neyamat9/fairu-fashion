import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        brand: "bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-100",
        orange: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
        success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
        danger: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
        info: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

function Badge({ className, variant, dot, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />}
      {children}
    </span>
  );
}

export { Badge };
