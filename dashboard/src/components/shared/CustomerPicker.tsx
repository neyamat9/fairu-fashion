import { useEffect, useRef, useState } from "react";
import { Loader2, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usersApi, type CustomerRow } from "@/api/users";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useDebounce } from "@/hooks/useDebounce";
import { LoadMore } from "./DataTable";

/**
 * Customer dropdown: opens with the full list as soon as you click the box (more load as you scroll),
 * and typing narrows it down after a short pause.
 */
export function CustomerPicker({ onPick, placeholder = "Click to choose, or type a name, email or phone…" }: { onPick: (c: CustomerRow) => void; placeholder?: string }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const q = useDebounce(text.trim(), 300);
  const box = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<HTMLDivElement | null>(null);
  const customers = useInfiniteList(["customer-picker", q], (page) => usersApi.list({ search: q || undefined, role: "USER", status: "ACTIVE", limit: 20, page }), { enabled: open });

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={box} className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        className="pl-8"
        autoComplete="off"
      />
      {customers.isFetching && !customers.isFetchingNextPage && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {open && (
        <div ref={setList} className="custom-scrollbar absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded border border-border bg-popover shadow-lg">
          {customers.isLoading && <p className="px-3 py-4 text-center text-xs text-muted-foreground">Loading customers…</p>}
          {!customers.isLoading && customers.rows.length === 0 && <p className="px-3 py-4 text-center text-xs text-muted-foreground">No customers found</p>}
          {customers.rows.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onPick(c);
                setText("");
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded bg-secondary text-secondary-foreground">
                <UserRound className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{c.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {c.phone ? `${c.phone} · ` : ""}
                  {c.email}
                </span>
              </span>
              {c.totalOrders > 0 && <span className="shrink-0 text-[10px] text-muted-foreground">{c.totalOrders} orders</span>}
            </button>
          ))}
          {customers.rows.length > 0 && (
            <>
              <LoadMore list={customers} root={list} />
              {customers.isFetchingNextPage && <p className="px-3 py-2 text-center text-[11px] text-muted-foreground">Loading more…</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
