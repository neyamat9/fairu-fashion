import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Package, Search, ShoppingBag, Users } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { menu } from "./menu";

interface Cmd {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  to: string;
}

/** Ctrl/⌘ + K: jump to any page, or search orders, products and customers by what you type. */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  const pages = useMemo<Cmd[]>(() => menu.flatMap((s) => s.items.map((i) => ({ id: i.to, label: i.label, hint: s.title, icon: i.icon, to: i.to }))), []);

  const text = q.trim();
  const list = useMemo<Cmd[]>(() => {
    const matches = text ? pages.filter((p) => `${p.label} ${p.hint}`.toLowerCase().includes(text.toLowerCase())) : pages;
    const enc = encodeURIComponent(text);
    const searches: Cmd[] = text
      ? [
          { id: "s-orders", label: `Search orders for “${text}”`, hint: "Order #, name, phone", icon: <ShoppingBag size={18} />, to: `/orders?search=${enc}` },
          { id: "s-products", label: `Search products for “${text}”`, hint: "Name, SKU, code", icon: <Package size={18} />, to: `/products?search=${enc}` },
          { id: "s-customers", label: `Search customers for “${text}”`, hint: "Name, email, phone", icon: <Users size={18} />, to: `/customers?search=${enc}` },
        ]
      : [];
    return [...matches, ...searches];
  }, [pages, text]);

  const go = (c: Cmd | undefined) => {
    if (!c) return;
    onOpenChange(false);
    navigate(c.to);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          setQ("");
          setActive(0);
        }
      }}
    >
      <DialogContent size="md" className="top-[12%] translate-y-0 gap-0 overflow-hidden p-0 max-sm:top-0 max-sm:!rounded-none" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Quick search</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, list.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(list[active]);
              }
            }}
            placeholder="Go to a page, or search orders, products, customers…"
            className="h-12 min-w-0 flex-1 bg-transparent pr-8 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Quick search"
          />
        </div>
        <ul className="custom-scrollbar max-h-[55vh] overflow-y-auto p-1.5" role="listbox">
          {list.length === 0 && <li className="px-3 py-8 text-center text-xs text-muted-foreground">Nothing matches.</li>}
          {list.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseMove={() => setActive(i)}
                onClick={() => go(c)}
                className={cn("flex w-full cursor-pointer items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors", i === active ? "bg-accent text-accent-foreground" : "text-foreground")}
              >
                <span className="text-muted-foreground">{c.icon}</span>
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                {c.hint && <span className="hidden text-[11px] text-muted-foreground sm:inline">{c.hint}</span>}
                {i === active && <ArrowRight className="size-3.5 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 border-t border-border bg-muted/50 px-4 py-2 text-[11px] text-muted-foreground sm:flex">
          <span><kbd className="rounded border border-border bg-card px-1">↑↓</kbd> move</span>
          <span><kbd className="rounded border border-border bg-card px-1">Enter</kbd> open</span>
          <span><kbd className="rounded border border-border bg-card px-1">Esc</kbd> close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
