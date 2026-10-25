import { cn } from "@/lib/utils";
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded bg-muted-foreground/15", className)} style={style} />;
}
