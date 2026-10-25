import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Bookmark, BookmarkPlus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export interface SavedView {
  name: string;
  /** the filters as a URL query, e.g. "status=PENDING&paymentMethod=BKASH" */
  query: string;
}

const key = (k: string) => `gb-views:${k}`;

function read(k: string): SavedView[] {
  try {
    const v = JSON.parse(localStorage.getItem(key(k)) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.name === "string" && typeof x.query === "string") : [];
  } catch {
    return [];
  }
}

/** Query without paging or sorting noise, in a stable order, so two views can be compared. */
const normalise = (q: string) => {
  const p = new URLSearchParams(q);
  p.delete("page");
  return [...p.entries()].filter(([, v]) => v !== "").sort(([a], [b]) => a.localeCompare(b)).map(([a, b]) => `${a}=${b}`).join("&");
};

/**
 * "Views" menu for a list page: built-in shortcuts plus filter sets the admin saved (kept in this browser).
 * A view is just the page's URL filters, so applying one is a plain navigation.
 */
export function SavedViews({ storageKey, builtIns = [] }: { storageKey: string; builtIns?: SavedView[] }) {
  const [params, setParams] = useSearchParams();
  const [mine, setMine] = useState<SavedView[]>(() => read(storageKey));
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    setMine(read(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (next: SavedView[]) => {
      setMine(next);
      try {
        localStorage.setItem(key(storageKey), JSON.stringify(next));
      } catch {
        toast.error("This browser could not save the view");
      }
    },
    [storageKey],
  );

  const current = normalise(params.toString());
  const active = [...builtIns, ...mine].find((v) => normalise(v.query) === current);
  const apply = (v: SavedView) => setParams(new URLSearchParams(v.query), { replace: true });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Saved views">
            <Bookmark /> <span className="max-w-32 truncate">{active ? active.name : "Views"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onSelect={() => setParams(new URLSearchParams(), { replace: true })}>
            <span className="flex-1">All (no filters)</span>
            {!current && <Check className="size-3.5" />}
          </DropdownMenuItem>
          {builtIns.length > 0 && <DropdownMenuSeparator />}
          {builtIns.map((v) => (
            <DropdownMenuItem key={v.name} onSelect={() => apply(v)}>
              <span className="flex-1">{v.name}</span>
              {active === v && <Check className="size-3.5" />}
            </DropdownMenuItem>
          ))}
          {mine.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">My views</DropdownMenuLabel>
            </>
          )}
          {mine.map((v) => (
            <DropdownMenuItem key={v.name} onSelect={() => apply(v)} className="group">
              <span className="flex-1 truncate">{v.name}</span>
              {active === v && <Check className="size-3.5" />}
              <button
                type="button"
                aria-label={`Delete view ${v.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  persist(mine.filter((x) => x.name !== v.name));
                }}
                className="cursor-pointer text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 group-focus:opacity-100 max-sm:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!current || !!active} onSelect={() => { setName(""); setNaming(true); }}>
            <BookmarkPlus /> Save current filters…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={naming} onOpenChange={setNaming}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Save this view</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = name.trim();
              if (!n) return;
              persist([...mine.filter((v) => v.name !== n), { name: n, query: current }]);
              setNaming(false);
              toast.success(`View “${n}” saved`);
            }}
          >
            <DialogBody>
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. bKash orders to verify" maxLength={40} />
              <p className="mt-2 text-xs text-muted-foreground">Remembers the current search and filters. Saved in this browser.</p>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNaming(false)}>Cancel</Button>
              <Button type="submit" disabled={!name.trim()}>Save view</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
