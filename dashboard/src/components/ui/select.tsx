import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldClass } from "./input";

interface Opt {
  value: string;
  label: React.ReactNode;
  text: string;
  disabled?: boolean;
}

const textOf = (n: React.ReactNode): string => (n == null || typeof n === "boolean" ? "" : typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(textOf).join("") : React.isValidElement(n) ? textOf((n.props as { children?: React.ReactNode }).children) : "");

/** `<option>` children (also inside fragments and `.map()` arrays) become a plain list. */
function collect(children: React.ReactNode, out: Opt[] = []): Opt[] {
  React.Children.forEach(children, (c) => {
    if (!React.isValidElement(c)) return;
    const p = c.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
    if (c.type === "option") {
      const text = textOf(p.children);
      out.push({ value: p.value === undefined ? text : String(p.value), label: p.children, text, disabled: p.disabled });
    } else if (p.children) collect(p.children, out);
  });
  return out;
}

type Props = Omit<React.ComponentProps<"select">, "value" | "defaultValue" | "onChange" | "multiple" | "size"> & {
  value?: string | number | readonly string[];
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** show a search box above the options (default: when there are more than 10) */
  searchable?: boolean;
  /** shown when no option matches the value */
  placeholder?: string;
};

/**
 * A drop-in replacement for the browser `<select>`: same props and `<option>` children, but the list is our own
 * (themed, searchable when long, keyboard friendly) instead of the operating system's grey popup.
 */
export const Select = React.forwardRef<HTMLButtonElement, Props>(function Select(
  { className, children, value, defaultValue, onChange, disabled, id, name, searchable, placeholder, "aria-label": ariaLabel, "aria-invalid": ariaInvalid, ...rest },
  ref,
) {
  const options = collect(children);
  const controlled = value !== undefined;
  const [inner, setInner] = React.useState(String(defaultValue ?? options[0]?.value ?? ""));
  const current = String(controlled ? value : inner);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const showSearch = searchable ?? options.length > 10;
  const selected = options.find((o) => o.value === current);
  const empty = current === "" && !!selected && selected.text.trim() !== "";
  const shown = showSearch && query ? options.filter((o) => o.text.toLowerCase().includes(query.trim().toLowerCase())) : options;

  const pick = (v: string) => {
    if (!controlled) setInner(v);
    if (v !== current) {
      const target = { value: v, name: name ?? "", id: id ?? "" };
      onChange?.({ target, currentTarget: target, type: "change" } as unknown as React.ChangeEvent<HTMLSelectElement>);
    }
    setOpen(false);
  };

  return (
    <DropdownMenuPrimitive.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          ref={ref}
          type="button"
          id={id}
          name={name}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          className={cn(fieldClass, "h-9 max-sm:h-10 cursor-pointer items-center justify-between gap-2 py-0 text-left", className)}
          {...(rest as unknown as React.ComponentProps<"button">)}
        >
          <span className={cn("min-w-0 flex-1 truncate", empty && "text-muted-foreground", !selected && "text-muted-foreground")}>{selected ? selected.label : (placeholder ?? "Select…")}</span>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={4}
          collisionPadding={8}
          role="listbox"
          className="z-[60] min-w-(--radix-dropdown-menu-trigger-width) max-w-[min(22rem,calc(100vw-1rem))] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded border border-border bg-popover text-popover-foreground shadow-lift data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1"
        >
          {showSearch && (
            <div className="relative border-b border-border p-1.5">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Escape" && e.key !== "ArrowDown" && e.key !== "ArrowUp") e.stopPropagation(); // typing must not trigger the menu's own type-ahead
                }}
                placeholder="Search…"
                aria-label="Search options"
                className="h-8 w-full rounded border border-input bg-card pl-7 pr-2 text-[13px] outline-none focus:border-ring"
              />
            </div>
          )}
          <div className="custom-scrollbar max-h-[min(18rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto p-1">
            {shown.length === 0 && <p className="px-3 py-4 text-center text-xs text-muted-foreground">Nothing matches “{query}”</p>}
            {shown.map((o) => {
              const on = o.value === current;
              return (
                <DropdownMenuPrimitive.Item
                  key={o.value}
                  role="option"
                  aria-selected={on}
                  disabled={o.disabled}
                  onSelect={() => pick(o.value)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-2 text-[13px] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground max-sm:py-2.5",
                    on && "bg-secondary font-semibold text-secondary-foreground data-[highlighted]:bg-accent",
                    o.value === "" && !on && "text-muted-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {on && <Check className="size-4 shrink-0 text-brand" aria-hidden="true" />}
                </DropdownMenuPrimitive.Item>
              );
            })}
          </div>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
});
Select.displayName = "Select";
