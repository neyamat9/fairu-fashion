import { useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Thumb } from "./Thumb";
import { productsApi, type ProductDetail } from "@/api/products";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useDebounce } from "@/hooks/useDebounce";
import { money } from "@/lib/format";
import { errorMessage } from "@/api/client";
import { toast } from "sonner";
import { LoadMore } from "./DataTable";

// Search the catalog and pick a product (loads its variants too). Opens with the whole list; more load as you scroll.
export function ProductPicker({ onPick, placeholder = "Search products by name, code or SKU…", onlyActive = true }: { onPick: (p: ProductDetail) => void; placeholder?: string; onlyActive?: boolean }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const q = useDebounce(text.trim(), 300);
  const box = useRef<HTMLDivElement>(null);
  const [list, setList] = useState<HTMLDivElement | null>(null);
  const products = useInfiniteList(["product-picker", q, onlyActive], (page) => productsApi.list({ search: q || undefined, limit: 20, page, status: onlyActive ? "ACTIVE" : undefined }), { enabled: open });

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
        placeholder={placeholder}
        className="pl-8"
        autoComplete="off"
      />
      {products.isFetching && !products.isFetchingNextPage && <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {open && (
        <div ref={setList} className="custom-scrollbar absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded border border-border bg-popover shadow-lg">
          {products.rows.length === 0 && !products.isFetching && <p className="px-3 py-4 text-center text-xs text-muted-foreground">No products found</p>}
          {products.rows.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={!!loadingId}
              onClick={async () => {
                setLoadingId(p.id);
                try {
                  const detail = await productsApi.get(p.id);
                  onPick(detail);
                  setText("");
                  setOpen(false);
                } catch (e) {
                  toast.error(errorMessage(e));
                } finally {
                  setLoadingId(null);
                }
              }}
              className="flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted disabled:opacity-60"
            >
              <Thumb src={p.mainImage} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{p.name}</span>
                <span className="block text-[11px] text-muted-foreground">{p._count.variants ? `${p._count.variants} options` : `${p.stock} in stock`}</span>
              </span>
              <span className="text-[13px] font-semibold">{money(p.sellingPrice)}</span>
              {loadingId === p.id && <Loader2 className="size-4 animate-spin" />}
            </button>
          ))}
          {products.rows.length > 0 && (
            <>
              <LoadMore list={products} root={list} />
              {products.isFetchingNextPage && <p className="px-3 py-2 text-center text-[11px] text-muted-foreground">Loading more…</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
