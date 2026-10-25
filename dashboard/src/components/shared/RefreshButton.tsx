import { useState } from "react";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Reloads everything on the page from the server (the list, the top cards, the counts), keeping filters,
 * search and scroll exactly where they are. Spins while it works, then says "Updated".
 */
export function RefreshButton({ className }: { className?: string }) {
  const qc = useQueryClient();
  const busyElsewhere = useIsFetching({ predicate: (q) => q.isActive() }) > 0;
  const [mine, setMine] = useState(false);
  const spinning = mine || busyElsewhere;

  const run = async () => {
    if (mine) return;
    setMine(true);
    const t0 = Date.now();
    try {
      // "active" = the queries this page is showing right now; others are refreshed when you open them
      await qc.refetchQueries({ type: "active" });
      // never flash: keep the spin visible for a moment so the click clearly did something
      const wait = 450 - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      toast.success("Updated", { duration: 1500 });
    } catch {
      toast.error("Could not refresh. Check your connection.");
    } finally {
      setMine(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={run} aria-label="Refresh" title="Refresh" disabled={mine} className={cn("px-2.5 sm:px-3", className)}>
      <RefreshCw className={cn(spinning && "animate-spin")} />
      <span className="max-sm:hidden">Refresh</span>
    </Button>
  );
}
