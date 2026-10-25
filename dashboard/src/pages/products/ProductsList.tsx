import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, MoreHorizontal, Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { productsApi, type ProductRow, type ProductStatus } from "@/api/products";
import { errorMessage } from "@/api/client";
import { QuickStatus, type QuickOption } from "@/components/shared/QuickStatus";
import { brandsApi, categoriesApi } from "@/api/catalog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Thumb } from "@/components/shared/Thumb";
import { ProductStatCards } from "./ProductStatCards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAct } from "@/hooks/useAct";
import { patchListRows, useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { money, titleCase } from "@/lib/format";
import { openInNewTab } from "@/lib/utils";
import { BulkBar } from "@/components/shared/BulkBar";
import { SavedViews } from "@/components/shared/SavedViews";

const STATUS_OPTIONS: QuickOption<string>[] = [
  { value: "ACTIVE", label: "Active (on the shop)" },
  { value: "DRAFT", label: "Draft (hidden)" },
  { value: "INACTIVE", label: "Inactive (hidden)" },
];

const DEFAULTS = { search: "", status: "", visibility: "", onDiscount: "", categoryId: "", brandId: "", stock: "", sortBy: "newest", page: "1" };

export default function ProductsList() {
  const navigate = useNavigate();
  const [f, setF] = useUrlState(DEFAULTS);
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [del, setDel] = useState<ProductRow | null>(null);

  const params = { ...f, search };
  const q = useInfiniteList(["products", params], (page) => productsApi.list({ ...params, page, limit: 20 }));
  const cats = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const brands = useQuery({ queryKey: ["brands"], queryFn: brandsApi.list });

  const dup = useAct((id: string) => productsApi.duplicate(id), { success: "Copy created as a draft", invalidate: [["products"]], onSuccess: (p) => navigate(`/products/${p.id}/edit`) });
  const qc = useQueryClient();
  // show/hide a product straight from the list; the row changes at once and goes back if the server says no
  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: ProductStatus }) => productsApi.update(v.id, { status: v.status }),
    onMutate: (v) => ({ undo: patchListRows(qc, ["products"], v.id, { status: v.status }) }),
    onError: (e, _v, ctx) => {
      ctx?.undo();
      toast.error(errorMessage(e));
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "ACTIVE" ? "Product is live on the shop" : "Product is hidden from the shop");
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
  const [sel, setSel] = useState<string[]>([]);
  const bulkStatus = useMutation({
    mutationFn: (status: ProductStatus) => Promise.all(sel.map((id) => productsApi.update(id, { status }))).then(() => status),
    onSuccess: (status) => {
      toast.success(`${sel.length} product${sel.length === 1 ? " is" : "s are"} now ${status === "ACTIVE" ? "live on the shop" : "hidden"}`);
      setSel([]);
      void qc.invalidateQueries({ queryKey: ["products"] });
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useAct((id: string) => productsApi.remove(id), { invalidate: [["products"], ["inventory"]], onSuccess: (r) => { void r; setDel(null); }, success: "Product removed" });

  const filtered = !!(f.search || f.status || f.visibility || f.onDiscount || f.categoryId || f.brandId || f.stock);

  const columns: Column<ProductRow>[] = [
    {
      key: "product",
      header: "Product", sk: "thumb2",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <Thumb src={p.mainImage} alt={p.name} className="size-11" />
          <div className="min-w-0 max-w-[280px]">
            <a href={`/products/${p.id}/edit`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block truncate font-medium hover:text-primary">{p.name}</a>
            <p className="truncate text-[11px] text-muted-foreground">{[p.productCode, p.brandName, p.categoryName].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status", sk: "badge",
      cell: (p) => (
        <QuickStatus
          current={p.status as string}
          options={STATUS_OPTIONS}
          title="Visibility"
          pending={setStatus.isPending && setStatus.variables?.id === p.id}
          onPick={(status) => setStatus.mutate({ id: p.id, status: status as ProductStatus })}
        />
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "right", sk: "num",
      cell: (p) => (
        <div>
          <p className="font-semibold">{money(p.sellingPrice)}</p>
          {p.isDiscounted && <p className="text-[11px] text-muted-foreground line-through">{money(p.priceBeforeDiscount ?? p.regularPrice)}</p>}
        </div>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      align: "right", sk: "stock",
      cell: (p) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-medium">{p.stock}</span>
          <StatusBadge status={p.stockState} label={p.stockState === "in" ? "In stock" : p.stockState === "low" ? "Low" : "Out"} />
        </div>
      ),
    },
    { key: "variants", header: "Variants", align: "center", sk: "badge", cell: (p) => (p._count.variants ? <Badge variant="brand">{p._count.variants}</Badge> : <span className="text-muted-foreground">—</span>) },
    { key: "sold", header: "Sold", align: "right", sk: "num", cell: (p) => p.soldCount },
    {
      key: "actions",
      header: "",
      align: "right", sk: "icon",
      cell: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Actions"><MoreHorizontal /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => openInNewTab(`/products/${p.id}/edit`)}><Pencil /> Edit</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => dup.mutate(p.id)}><Copy /> Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onSelect={() => setDel(p)}><Trash2 /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Everything you sell. Click a product to edit it."
        actions={
          <>
            <SavedViews storageKey="products" builtIns={[{ name: "Low stock", query: "stock=low" }, { name: "Out of stock", query: "stock=out" }, { name: "Hidden", query: "status=INACTIVE" }, { name: "Drafts", query: "status=DRAFT" }]} />
            <Button asChild variant="brand" size="sm"><Link to="/products/new"><PlusCircle /> Add product</Link></Button>
          </>
        }
      />
      <ProductStatCards current={{ status: f.status, visibility: f.visibility, stock: f.stock, onDiscount: f.onDiscount }} onPick={(c) => setF({ status: c.status, visibility: c.visibility, stock: c.stock, onDiscount: c.onDiscount })} />
      <DataTable
        infinite={q}
        selectable
        selected={sel}
        onSelect={setSel}
        columns={columns}
        onRowClick={(p) => openInNewTab(`/products/${p.id}/edit`)}
        empty={{ title: filtered ? "No products match these filters" : "No products yet", description: filtered ? "Try clearing a filter." : "Add your first product to start selling.", action: filtered ? undefined : <Button asChild variant="brand" size="sm"><Link to="/products/new">Add product</Link></Button> }}
        toolbar={
          <FilterBar>
            <SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Name, code, SKU, barcode…" />
            <FilterSelect value={f.status} onChange={(v) => setF({ status: v, visibility: "" })} all="All statuses" options={["ACTIVE", "DRAFT", "INACTIVE", "OUT_OF_STOCK", "DISCONTINUED"].map((s) => ({ value: s, label: titleCase(s) }))} />
            <FilterSelect value={f.categoryId} onChange={(v) => setF({ categoryId: v })} all="All categories" options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.name }))} />
            <FilterSelect value={f.brandId} onChange={(v) => setF({ brandId: v })} all="All brands" options={(brands.data ?? []).map((b) => ({ value: b.id, label: b.name }))} />
            <FilterSelect value={f.stock} onChange={(v) => setF({ stock: v })} all="Any stock" options={[{ value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }, { value: "in", label: "In stock" }]} />
            <FilterSelect value={f.sortBy} onChange={(v) => setF({ sortBy: v })} all={null} options={[{ value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" }, { value: "name", label: "Name A–Z" }, { value: "price-asc", label: "Price: low to high" }, { value: "price-desc", label: "Price: high to low" }, { value: "stock-asc", label: "Stock: low first" }, { value: "sold", label: "Best selling" }]} />
            {filtered && <Button size="sm" variant="ghost" onClick={() => { setF({ search: "", status: "", visibility: "", onDiscount: "", categoryId: "", brandId: "", stock: "" }); }}><X /> Clear</Button>}
          </FilterBar>
        }
      />
      <BulkBar count={sel.length} onClear={() => setSel([])} noun={sel.length === 1 ? "product" : "products"}>
        <Button size="sm" variant="brand" loading={bulkStatus.isPending && bulkStatus.variables === "ACTIVE"} onClick={() => bulkStatus.mutate("ACTIVE")}>Show on shop</Button>
        <Button size="sm" variant="secondary" loading={bulkStatus.isPending && bulkStatus.variables === "INACTIVE"} onClick={() => bulkStatus.mutate("INACTIVE")}>Hide</Button>
      </BulkBar>
      <ConfirmDialog
        open={!!del}
        onOpenChange={(o) => !o && setDel(null)}
        title={`Delete "${del?.name}"?`}
        description={del && del._count.orderItems > 0 ? "This product has been ordered before, so it will be hidden (archived) instead of erased. Order history stays intact." : "This cannot be undone."}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => del && remove.mutate(del.id)}
      />
    </div>
  );
}
