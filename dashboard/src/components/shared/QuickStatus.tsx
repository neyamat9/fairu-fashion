import type { ReactNode } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge } from "./StatusBadge";
import { useConfirm } from "@/hooks/useConfirm";
import { cn } from "@/lib/utils";

export interface QuickOption<T extends string> {
  value: T;
  label: string;
  /** red item; asks before applying */
  destructive?: boolean;
  /** ask first, with this text */
  confirm?: string;
  hint?: string;
  icon?: ReactNode;
}

/**
 * A status badge that opens a menu of the next steps: change a status in two taps without leaving the list.
 * Clicking it never opens the row, so it is safe inside clickable rows and cards.
 */
export function QuickStatus<T extends string>({
  current,
  options,
  onPick,
  pending,
  locked,
  label,
  title = "Change status",
}: {
  current: T;
  options: QuickOption<T>[];
  onPick: (value: T) => void;
  pending?: boolean;
  /** final states: just the badge, no menu */
  locked?: boolean;
  label?: string;
  title?: string;
}) {
  const confirm = useConfirm();
  if (locked) return <StatusBadge status={current} label={label} />;

  const pick = async (o: QuickOption<T>) => {
    if (o.value === current) return;
    if (o.destructive || o.confirm) {
      const ok = await confirm({ title: o.confirm ?? `${o.label}?`, confirmLabel: o.label, destructive: o.destructive });
      if (!ok) return;
    }
    onPick(o.value);
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="inline-flex">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={pending}
            aria-label={`${title}: now ${label ?? current}`}
            className={cn("group inline-flex cursor-pointer items-center gap-0.5 rounded outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring/60", pending && "opacity-70")}
          >
            <StatusBadge status={current} label={label} />
            {pending ? <Loader2 className="size-3 animate-spin text-muted-foreground" /> : <ChevronDown className="size-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-48">
          <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</DropdownMenuLabel>
          {options.map((o, i) => (
            <div key={o.value}>
              {o.destructive && i > 0 && !options[i - 1]?.destructive && <DropdownMenuSeparator />}
              <DropdownMenuItem
                variant={o.destructive ? "destructive" : undefined}
                disabled={o.value === current}
                onSelect={() => void pick(o)}
              >
                {o.icon}
                <span className="flex-1">{o.label}</span>
                {o.value === current ? <Check className="size-3.5" /> : o.hint ? <span className="text-[10px] text-muted-foreground">{o.hint}</span> : null}
              </DropdownMenuItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
