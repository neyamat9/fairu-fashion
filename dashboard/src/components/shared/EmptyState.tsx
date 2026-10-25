import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ title = "Nothing here yet", description, action, icon }: { title?: string; description?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded border border-dashed border-border bg-muted/60 text-muted-foreground">{icon ?? <Inbox className="size-6" />}</div>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded border border-dashed border-red-300 bg-red-50 text-destructive dark:border-red-500/40 dark:bg-red-500/10">
        <AlertTriangle className="size-5" />
      </div>
      <p className="text-sm font-semibold">Could not load this</p>
      <p className="max-w-sm text-xs text-muted-foreground">{message ?? "Check your connection and try again."}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
