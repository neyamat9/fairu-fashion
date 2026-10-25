import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "navy",
  change,
  loading,
  onClick,
  spark,
  hintSk,
  active,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "navy" | "orange" | "green" | "red" | "sky";
  // percent change vs the previous period (null = no comparison)
  change?: number | null;
  loading?: boolean;
  onClick?: () => void;
  /** a small trend line under the number (one value per day/week) */
  spark?: number[];
  /** while loading, hold space for the hint line (set on cards that normally have one) */
  hintSk?: boolean;
  /** this card's filter is the one applied to the list below */
  active?: boolean;
}) {
  const tones = {
    navy: "bg-navy-100 text-navy-700 dark:bg-navy-800 dark:text-navy-100",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  };
  const accents = { navy: "bg-navy-500", orange: "bg-brand", green: "bg-success", red: "bg-destructive", sky: "bg-sky-500" };
  return (
    <Card
      className={cn("relative overflow-hidden p-3 sm:p-4", onClick && "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lift", active && "border-ring ring-2 ring-ring/30")}
      onClick={onClick}
      {...(onClick ? { role: "button", tabIndex: 0, "aria-pressed": !!active, onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onClick()) } : {})}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", accents[tone])} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          {loading ? <div className="mt-1 flex h-7 items-center sm:h-8"><Skeleton className="h-6 w-24" /></div> : <p className="mt-1 truncate font-heading text-xl font-bold tracking-tight sm:text-2xl">{value}</p>}
        </div>
        {icon && <div className={cn("flex size-8 shrink-0 items-center justify-center rounded sm:size-10", tones[tone])}>{icon}</div>}
      </div>
      {loading && spark !== undefined && <Skeleton className="mt-2 h-7 w-full" />}
      {spark && spark.length > 1 && !loading && <Sparkline data={spark} tone={tone} />}
      <div className="mt-2 flex items-center gap-2 text-xs">
        {change !== undefined && change !== null && !loading && (
          <span className={cn("inline-flex items-center gap-0.5 font-semibold", change >= 0 ? "text-success" : "text-destructive")}>
            {change >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(change)}%
          </span>
        )}
        {loading && hintSk && <div className="flex h-4 items-center"><Skeleton className="h-3 w-24" /></div>}
        {hint && <span className="truncate text-muted-foreground">{hint}</span>}
      </div>
    </Card>
  );
}

const STROKE = { navy: "var(--color-navy-500)", orange: "var(--color-orange-500)", green: "var(--success)", red: "var(--destructive)", sky: "#0ea5e9" } as const;

/** Tiny area line, drawn with plain SVG so every card stays light. */
function Sparkline({ data, tone }: { data: number[]; tone: keyof typeof STROKE }) {
  const w = 120;
  const h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 2 - ((v - min) / span) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const id = `sp-${tone}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-2 h-7 w-full" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={STROKE[tone]} stopOpacity="0.28" />
          <stop offset="100%" stopColor={STROKE[tone]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={STROKE[tone]} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
