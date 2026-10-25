import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Row of filters. On phones the search box stays visible and the rest folds into a "Filters" panel (with a count of the active ones);
 * from md up everything sits in one wrapping row, as before.
 */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const kids = Children.toArray(children);
  const isSearch = (c: ReactNode) => isValidElement(c) && c.type === SearchInput;
  const search = kids.filter(isSearch);
  const rest = kids.filter((c) => !isSearch(c));
  if (search.length === 0 || rest.length === 0) {
    return <div className={cn("flex flex-wrap items-center gap-2 border-b border-border p-3", className)}>{children}</div>;
  }
  const active = rest.filter((c) => {
    const p = isValidElement(c) ? (c.props as { value?: unknown; all?: unknown }) : null;
    return !!p && typeof p.value === "string" && p.value !== "" && p.all !== null;
  }).length;
  return (
    <div className={cn("flex flex-wrap items-center gap-2 border-b border-border p-3", className)}>
      {search}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 md:hidden"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal /> Filters
        {active > 0 && <span className="rounded bg-brand px-1.5 text-[10px] font-bold leading-4 text-brand-foreground">{active}</span>}
      </Button>
      <div className={cn("w-full grid-cols-2 items-center gap-2 max-md:[&>*]:min-w-0 md:contents", open ? "grid" : "hidden md:contents")}>{rest}</div>
    </div>
  );
}

/**
 * Search box that waits for a pause in typing (350 ms) before telling the page, so a list is never queried per keystroke.
 * Enter searches at once, ✕ clears at once, and "/" focuses it from anywhere.
 */
export function SearchInput({ value, onChange, placeholder = "Search…", className, delay = 350 }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; delay?: number }) {
  const [text, setText] = useState(value);
  const sent = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const input = useRef<HTMLInputElement>(null);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });

  // the page changed the value itself (e.g. "Clear filters"): follow it
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors a change made outside the box
      setText(value);
    }
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || t?.closest("input,textarea,select,[contenteditable='true']")) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const send = (v: string) => {
    clearTimeout(timer.current);
    if (v === sent.current) return;
    sent.current = v;
    cb.current(v);
  };
  const type = (v: string) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(v), delay);
  };

  return (
    <div className={cn("relative min-w-0 flex-1 basis-full sm:basis-[220px] sm:max-w-xs", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={input}
        value={text}
        onChange={(e) => type(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send(text)}
        placeholder={placeholder}
        className="pl-8 pr-7"
        enterKeyHint="search"
        autoComplete="off"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            send("");
            input.current?.focus();
          }}
          className="absolute right-1 top-1/2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  all = "All",
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  all?: string | null;
  className?: string;
  label?: string;
}) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={cn("w-auto min-w-[130px] max-md:w-full max-md:min-w-0", className)} aria-label={label ?? all ?? "Filter"}>
      {all !== null && <option value="">{all}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}

export function DateInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="w-[140px] max-md:w-full max-md:min-w-0" />
    </label>
  );
}
