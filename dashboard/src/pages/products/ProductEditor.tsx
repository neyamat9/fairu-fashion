import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { Field, Section } from "@/components/shared/Field";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ErrorState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { brandsApi, categoriesApi, slugify } from "@/api/catalog";
import { productsApi, type ProductDetail, type ProductInput, type ProductStatus } from "@/api/products";
import { errorMessage } from "@/api/client";
import { useAct } from "@/hooks/useAct";
import { fromLocalInput, money, toLocalInput, titleCase } from "@/lib/format";
import { VariantsEditor } from "./components/VariantsEditor";
import { draftError, fromVariant, toInput, type VariantDraft } from "./components/variantDraft";
import { PhotosEditor } from "./components/PhotosEditor";
import { ProductEditorSkeleton } from "@/components/shared/pageSkeletons";

interface Form {
  name: string; slug: string; productCode: string; barcode: string; status: ProductStatus;
  categoryId: string; subCategoryId: string; brandId: string;
  shortDescription: string; description: string; warrantyInfo: string;
  buyingPrice: string; regularPrice: string; sellingPrice: string;
  discountPrice: string; discountStart: string; discountEnd: string; discountLabel: string;
  stock: string; lowStockThreshold: string; freeShipping: boolean;
  weight: string; length: string; width: string; height: string;
  isFeatured: boolean; isNew: boolean; isHot: boolean; isBestSeller: boolean; isLimitedStock: boolean;
  metaTitle: string; metaDescription: string; metaKeywords: string;
  inTheBox: string; tags: string;
  specs: { title: string; items: { key: string; value: string }[] }[];
  attrs: { name: string; value: string }[];
}

const blank: Form = {
  name: "", slug: "", productCode: "", barcode: "", status: "ACTIVE", categoryId: "", subCategoryId: "", brandId: "",
  shortDescription: "", description: "", warrantyInfo: "", buyingPrice: "", regularPrice: "", sellingPrice: "",
  discountPrice: "", discountStart: "", discountEnd: "", discountLabel: "", stock: "0", lowStockThreshold: "5", freeShipping: false,
  weight: "", length: "", width: "", height: "", isFeatured: false, isNew: false, isHot: false, isBestSeller: false, isLimitedStock: false,
  metaTitle: "", metaDescription: "", metaKeywords: "", inTheBox: "", tags: "", specs: [], attrs: [],
};
const n = (v?: string | number | null) => (v === null || v === undefined ? "" : String(Number(v)));
const toForm = (p: ProductDetail): Form => ({
  name: p.name, slug: p.slug, productCode: p.productCode ?? "", barcode: p.barcode ?? "", status: p.status,
  categoryId: p.categoryId, subCategoryId: p.subCategoryId ?? "", brandId: p.brandId ?? "",
  shortDescription: p.shortDescription ?? "", description: p.description, warrantyInfo: p.warrantyInfo ?? "",
  buyingPrice: n(p.buyingPrice), regularPrice: n(p.regularPrice), sellingPrice: n(p.priceBeforeDiscount ?? p.sellingPrice),
  discountPrice: p.discountPrice ? n(p.discountPrice) : "", discountStart: toLocalInput(p.discountStart), discountEnd: toLocalInput(p.discountEnd), discountLabel: p.discountLabel ?? "",
  stock: String(p.stock), lowStockThreshold: String(p.lowStockThreshold), freeShipping: p.freeShipping,
  weight: n(p.weight), length: n(p.length), width: n(p.width), height: n(p.height),
  isFeatured: p.isFeatured, isNew: p.isNew, isHot: p.isHot, isBestSeller: p.isBestSeller, isLimitedStock: p.isLimitedStock,
  metaTitle: p.metaTitle ?? "", metaDescription: p.metaDescription ?? "", metaKeywords: p.metaKeywords ?? "",
  inTheBox: p.inTheBox.join("\n"), tags: p.tags.join(", "),
  specs: p.specifications.map((s) => ({ title: s.title, items: s.items.map((i) => ({ key: i.key, value: i.value })) })),
  attrs: p.attributes.map((a) => ({ name: a.name, value: a.value })),
});
const num = (v: string) => (v.trim() === "" ? undefined : Number(v));

export default function ProductEditor() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ["product", id], queryFn: () => productsApi.get(id!), enabled: !!id });
  if (id && q.isLoading) return <ProductEditorSkeleton />;
  if (id && (q.isError || !q.data)) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  return <ProductForm key={id ?? "new"} id={id} p={q.data} />;
}

function ProductForm({ id, p }: { id?: string; p?: ProductDetail }) {
  const nav = useNavigate();
  const isNew = !id;
  const [f, setF] = useState<Form>(() => (p ? toForm(p) : blank));
  const [slugTouched, setSlugTouched] = useState(!!p);
  const [variants, setVariants] = useState<VariantDraft[]>(() => (p ? p.variants.map(fromVariant) : []));
  const [staged, setStaged] = useState<File[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("basics");
  const [delOpen, setDelOpen] = useState(false);
  const cats = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const brands = useQuery({ queryKey: ["brands"], queryFn: brandsApi.list });

  // when variants are added / removed on the server, show the server's list
  const sig = p ? p.variants.map((v) => v.id).join(",") : "";
  const [seenSig, setSeenSig] = useState(sig);
  if (sig !== seenSig) {
    setSeenSig(sig);
    setVariants((cur) => [...p!.variants.map((v) => fromVariant(v)), ...cur.filter((d) => !d.id)]);
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const subs = useMemo(() => cats.data?.find((c) => c.id === f.categoryId)?.subCategories ?? [], [cats.data, f.categoryId]);
  const hasVariants = variants.length > 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (f.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) e.slug = "Lowercase letters, numbers and single dashes";
    if (!f.categoryId) e.categoryId = "Choose a category";
    if (!f.description.trim()) e.description = "Add a description";
    if (f.buyingPrice === "" || Number(f.buyingPrice) < 0) e.buyingPrice = "Enter the cost price";
    if (!(Number(f.regularPrice) > 0)) e.regularPrice = "Enter the regular (MRP) price";
    if (!(Number(f.sellingPrice) > 0)) e.sellingPrice = "Enter the selling price";
    if (f.discountPrice !== "") {
      if (Number(f.discountPrice) >= Number(f.sellingPrice)) e.discountPrice = "Must be lower than the selling price";
      if (f.discountStart && f.discountEnd && new Date(f.discountEnd) <= new Date(f.discountStart)) e.discountEnd = "Must be after the start";
    }
    for (const d of variants) { const m = draftError(d); if (m) { e.variants = `Variant ${d.sku || d.name || "(new)"}: ${m}`; break; } }
    const skus = variants.map((d) => d.sku.trim().toLowerCase());
    if (new Set(skus).size !== skus.length) e.variants = "Two variants share the same SKU";
    setErrs(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      setTab(e.variants ? "variants" : e.buyingPrice || e.regularPrice || e.sellingPrice || e.discountPrice || e.discountEnd ? "pricing" : "basics");
    }
    return Object.keys(e).length === 0;
  };

  const build = (): ProductInput => {
    const clearOr = (v: string) => (v.trim() === "" ? null : v);
    return {
      name: f.name.trim(), slug: f.slug || undefined, productCode: f.productCode.trim() || undefined, barcode: f.barcode.trim() || undefined,
      description: f.description, shortDescription: f.shortDescription || undefined, warrantyInfo: f.warrantyInfo || undefined,
      status: f.status, categoryId: f.categoryId, subCategoryId: f.subCategoryId || undefined, brandId: f.brandId || undefined,
      buyingPrice: Number(f.buyingPrice), regularPrice: Number(f.regularPrice), sellingPrice: Number(f.sellingPrice),
      discountPrice: f.discountPrice === "" ? null : Number(f.discountPrice),
      discountStart: f.discountPrice === "" ? null : fromLocalInput(f.discountStart),
      discountEnd: f.discountPrice === "" ? null : fromLocalInput(f.discountEnd),
      discountLabel: clearOr(f.discountLabel),
      ...(hasVariants ? {} : { stock: Number(f.stock || 0) }),
      lowStockThreshold: Number(f.lowStockThreshold || 0), freeShipping: f.freeShipping,
      weight: num(f.weight), length: num(f.length), width: num(f.width), height: num(f.height),
      isFeatured: f.isFeatured, isNew: f.isNew, isHot: f.isHot, isBestSeller: f.isBestSeller, isLimitedStock: f.isLimitedStock,
      metaTitle: f.metaTitle || undefined, metaDescription: f.metaDescription || undefined, metaKeywords: f.metaKeywords || undefined,
      inTheBox: f.inTheBox.split("\n").map((s) => s.trim()).filter(Boolean),
      tags: f.tags.split(",").map((s) => s.trim()).filter(Boolean),
      specifications: f.specs.filter((s) => s.title.trim()).map((s) => ({ title: s.title.trim(), items: s.items.filter((i) => i.key.trim()).map((i) => ({ key: i.key.trim(), value: i.value })) })),
      attributes: f.attrs.filter((a) => a.name.trim() && a.value.trim()),
    };
  };

  const save = useAct(
    async () => {
      if (!validate()) throw new Error("Validation");
      if (isNew) {
        const p = await productsApi.create({ ...build(), ...(hasVariants ? { variants: variants.map(toInput) } : {}) });
        if (staged.length) await productsApi.uploadImages(p.id, staged).catch((e) => toast.warning(`Product saved, but photos failed: ${errorMessage(e)}`));
        return p;
      }
      return productsApi.update(id!, build());
    },
    {
      success: isNew ? "Product created" : "Product saved",
      invalidate: [["products"], ["product", id], ["inventory"]],
      onSuccess: (p) => { if (isNew) nav(`/products/${p.id}/edit`, { replace: true }); },
      silentError: (e) => e instanceof Error && e.message === "Validation",
    },
  );
  const dup = useAct(() => productsApi.duplicate(id!), { success: "Copy created as a draft", invalidate: [["products"]], onSuccess: (p) => nav(`/products/${p.id}/edit`) });
  const del = useAct(() => productsApi.remove(id!), { success: "Product removed", invalidate: [["products"]], onSuccess: () => nav("/products") });

  const margin = Number(f.sellingPrice) > 0 && f.buyingPrice !== "" ? ((Number(f.sellingPrice) - Number(f.buyingPrice)) / Number(f.sellingPrice)) * 100 : null;

  return (
    <div>
      <PageHeader
        back={{ to: "/products", label: "Products" }}
        title={<span className="flex items-center gap-2">{isNew ? "Add product" : f.name || "Edit product"}{p && <StatusBadge status={p.status} />}</span>}
        description={p ? `${p._count.orderItems} sold orders · ${p._count.reviews} reviews · ${p._count.questions} questions` : "Fill in the details, then add photos and variants."}
        actions={
          <>
            {!isNew && <Button variant="outline" size="sm" loading={dup.isPending} onClick={() => dup.mutate()}><Copy /> Duplicate</Button>}
            {!isNew && <Button variant="outline" size="sm" onClick={() => setDelOpen(true)}><Trash2 className="text-destructive" /> Delete</Button>}
            <Button variant="brand" size="sm" loading={save.isPending} onClick={() => save.mutate()}>{isNew ? "Create product" : "Save changes"}</Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="inventory">Inventory & shipping</TabsTrigger>
          <TabsTrigger value="photos">Photos{p ? ` (${p.images.length})` : staged.length ? ` (${staged.length})` : ""}</TabsTrigger>
          <TabsTrigger value="variants">Variants{variants.length ? ` (${variants.length})` : ""}</TabsTrigger>
          <TabsTrigger value="details">Specs & tags</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-4">
          <Section title="General">
            <div className="space-y-3">
              <Field label="Product name" required error={errs.name}>
                <Input value={f.name} maxLength={200} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="URL slug" error={errs.slug} hint="Auto-made from the name"><Input value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} /></Field>
                <Field label="Product code / SKU"><Input value={f.productCode} onChange={(e) => set("productCode", e.target.value)} /></Field>
                <Field label="Barcode"><Input value={f.barcode} onChange={(e) => set("barcode", e.target.value)} /></Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Category" required error={errs.categoryId}>
                  <Select value={f.categoryId} onChange={(e) => { set("categoryId", e.target.value); set("subCategoryId", ""); }}>
                    <option value="">Choose…</option>
                    {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label="Sub-category">
                  <Select value={f.subCategoryId} onChange={(e) => set("subCategoryId", e.target.value)} disabled={!subs.length}>
                    <option value="">None</option>
                    {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label="Brand">
                  <Select value={f.brandId} onChange={(e) => set("brandId", e.target.value)}>
                    <option value="">No brand</option>
                    {brands.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
                <Field label="Status" hint="Draft / inactive are hidden from the shop">
                  <Select value={f.status} onChange={(e) => set("status", e.target.value as ProductStatus)}>
                    {["ACTIVE", "DRAFT", "INACTIVE", "OUT_OF_STOCK", "DISCONTINUED"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
          </Section>
          <Section title="Description">
            <div className="space-y-3">
              <Field label="Short description" hint="One or two lines, shown near the price"><Textarea rows={2} maxLength={1000} value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></Field>
              <Field label="Full description" required error={errs.description}><Textarea rows={8} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
              <Field label="Warranty"><Input value={f.warrantyInfo} maxLength={300} onChange={(e) => set("warrantyInfo", e.target.value)} placeholder="e.g. 1 year official warranty" /></Field>
            </div>
          </Section>
          <Section title="Badges & shop sections" description="Where the product is highlighted on the website.">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {([["isFeatured", "Featured"], ["isNew", "New arrival"], ["isHot", "Hot"], ["isBestSeller", "Best seller"], ["isLimitedStock", "Limited stock"]] as const).map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={f[k]} onChange={(e) => set(k, e.target.checked)} />{label}</label>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Section title="Prices (৳)">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Cost price (what you pay)" required error={errs.buyingPrice}><Input type="number" min={0} step="0.01" value={f.buyingPrice} onChange={(e) => set("buyingPrice", e.target.value)} /></Field>
              <Field label="Regular price (MRP)" required error={errs.regularPrice} hint="The crossed-out 'was' price"><Input type="number" min={0} step="0.01" value={f.regularPrice} onChange={(e) => set("regularPrice", e.target.value)} /></Field>
              <Field label="Selling price" required error={errs.sellingPrice}><Input type="number" min={0} step="0.01" value={f.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} /></Field>
            </div>
            {margin !== null && <p className="mt-3 text-xs text-muted-foreground">Margin at the selling price: <b className={margin < 0 ? "text-destructive" : "text-foreground"}>{margin.toFixed(1)}%</b> · profit {money(Number(f.sellingPrice) - Number(f.buyingPrice))} per unit</p>}
          </Section>
          <Section title="Scheduled discount" description="The promo price switches on and off by itself between the two dates. Leave the price empty for no discount.">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Promo price ৳" error={errs.discountPrice}><Input type="number" min={0} step="0.01" value={f.discountPrice} onChange={(e) => set("discountPrice", e.target.value)} /></Field>
              <Field label="Starts" hint="Empty = now"><Input type="datetime-local" value={f.discountStart} onChange={(e) => set("discountStart", e.target.value)} disabled={f.discountPrice === ""} /></Field>
              <Field label="Ends" error={errs.discountEnd} hint="Empty = until removed"><Input type="datetime-local" value={f.discountEnd} onChange={(e) => set("discountEnd", e.target.value)} disabled={f.discountPrice === ""} /></Field>
              <Field label="Label"><Input value={f.discountLabel} maxLength={60} onChange={(e) => set("discountLabel", e.target.value)} placeholder="Eid offer" disabled={f.discountPrice === ""} /></Field>
            </div>
            {p?.isDiscounted && <p className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">Discount is live now: customers pay {money(p.sellingPrice)}.</p>}
          </Section>
          {p && p.priceHistory.length > 0 && (
            <Section title="Price history">
              <ul className="space-y-1 text-[13px]">
                {p.priceHistory.slice(0, 8).map((h) => <li key={h.id} className="flex justify-between"><span className="text-muted-foreground">{new Date(h.recordedAt).toLocaleString()}</span><b>{money(h.price)}</b></li>)}
              </ul>
            </Section>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Section title="Stock">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Quantity in stock" hint={hasVariants ? "Total of the variants — change each variant's stock instead" : isNew ? "Opening stock" : "Use Inventory → Adjust to change stock with a record"}>
                <Input type="number" min={0} value={hasVariants ? String(variants.reduce((s, v) => s + Number(v.stock || 0), 0)) : f.stock} onChange={(e) => set("stock", e.target.value)} disabled={hasVariants || !isNew} />
              </Field>
              <Field label="Low-stock alert at" hint="You get a bell alert when stock drops to this"><Input type="number" min={0} value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} /></Field>
            </div>
          </Section>
          <Section title="Shipping">
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={f.freeShipping} onChange={(e) => set("freeShipping", e.target.checked)} />Free shipping for this product</label>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Weight (kg)"><Input type="number" min={0} step="0.01" value={f.weight} onChange={(e) => set("weight", e.target.value)} /></Field>
                <Field label="Length (cm)"><Input type="number" min={0} value={f.length} onChange={(e) => set("length", e.target.value)} /></Field>
                <Field label="Width (cm)"><Input type="number" min={0} value={f.width} onChange={(e) => set("width", e.target.value)} /></Field>
                <Field label="Height (cm)"><Input type="number" min={0} value={f.height} onChange={(e) => set("height", e.target.value)} /></Field>
              </div>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="photos">
          <Section title="Photos"><PhotosEditor productId={id} images={p?.images} staged={staged} onStage={setStaged} /></Section>
        </TabsContent>

        <TabsContent value="variants">
          <Section title="Variants">
            {errs.variants && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-xs font-medium text-destructive dark:bg-red-500/10">{errs.variants}</p>}
            <VariantsEditor productId={id} value={variants} onChange={setVariants} saved={p?.variants} />
          </Section>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Section title="Specifications" description="Grouped tables shown on the product page, e.g. Display → Size: 6.7 inch.">
            <div className="space-y-4">
              {f.specs.map((s, si) => (
                <div key={si} className="rounded border border-border p-3">
                  <div className="mb-2 flex gap-2">
                    <Input value={s.title} onChange={(e) => set("specs", f.specs.map((x, i) => (i === si ? { ...x, title: e.target.value } : x)))} placeholder="Group title (Display, Battery…)" className="font-medium" />
                    <Button size="icon-sm" variant="ghost" aria-label="Remove group" onClick={() => set("specs", f.specs.filter((_, i) => i !== si))}><Trash2 className="text-destructive" /></Button>
                  </div>
                  {s.items.map((it, ii) => (
                    <div key={ii} className="mb-2 flex gap-2">
                      <Input value={it.key} placeholder="Name" onChange={(e) => set("specs", f.specs.map((x, i) => (i === si ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, key: e.target.value } : y)) } : x)))} />
                      <Input value={it.value} placeholder="Value" onChange={(e) => set("specs", f.specs.map((x, i) => (i === si ? { ...x, items: x.items.map((y, j) => (j === ii ? { ...y, value: e.target.value } : y)) } : x)))} />
                      <Button size="icon-sm" variant="ghost" aria-label="Remove row" onClick={() => set("specs", f.specs.map((x, i) => (i === si ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x)))}><Trash2 /></Button>
                    </div>
                  ))}
                  <Button size="xs" variant="outline" onClick={() => set("specs", f.specs.map((x, i) => (i === si ? { ...x, items: [...x.items, { key: "", value: "" }] } : x)))}><Plus /> Row</Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("specs", [...f.specs, { title: "", items: [{ key: "", value: "" }] }])}><Plus /> Add group</Button>
            </div>
          </Section>
          <Section title="Filter attributes" description="Used by the shop's filters, e.g. RAM = 8GB, Network = 5G.">
            <div className="space-y-2">
              {f.attrs.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={a.name} placeholder="Name" onChange={(e) => set("attrs", f.attrs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                  <Input value={a.value} placeholder="Value" onChange={(e) => set("attrs", f.attrs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <Button size="icon-sm" variant="ghost" aria-label="Remove" onClick={() => set("attrs", f.attrs.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("attrs", [...f.attrs, { name: "", value: "" }])}><Plus /> Add attribute</Button>
            </div>
          </Section>
          <Section title="Tags & box contents">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tags" hint="Separate with commas"><Input value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="5G, gaming, fast charging" /></Field>
              <Field label="What's in the box" hint="One item per line"><Textarea rows={4} value={f.inTheBox} onChange={(e) => set("inTheBox", e.target.value)} /></Field>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="seo">
          <Section title="Search engines" description="Shown in Google results. Leave empty to use the product name and description.">
            <div className="space-y-3">
              <Field label="Meta title" hint={`${f.metaTitle.length}/70`}><Input value={f.metaTitle} maxLength={70} onChange={(e) => set("metaTitle", e.target.value)} /></Field>
              <Field label="Meta description" hint={`${f.metaDescription.length}/160`}><Textarea rows={3} maxLength={160} value={f.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} /></Field>
              <Field label="Keywords"><Input value={f.metaKeywords} onChange={(e) => set("metaKeywords", e.target.value)} /></Field>
              <div className="rounded border border-border p-3">
                <p className="text-[13px] font-medium text-blue-700 dark:text-blue-400">{f.metaTitle || f.name || "Product title"}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">fairufashion.com/products/{f.slug || "product-slug"}</p>
                <p className="text-xs text-muted-foreground">{f.metaDescription || f.shortDescription || "Description appears here."}</p>
              </div>
            </div>
          </Section>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={() => nav("/products")}>Back to list</Button>
        <Button variant="brand" loading={save.isPending} onClick={() => save.mutate()}>{isNew ? "Create product" : "Save changes"}</Button>
      </div>

      <ConfirmDialog open={delOpen} onOpenChange={setDelOpen} title={`Delete "${f.name}"?`} description={p && p._count.orderItems > 0 ? "It has been ordered before, so it is hidden instead of erased. Order history stays intact." : "This cannot be undone."} confirmLabel="Delete" destructive loading={del.isPending} onConfirm={() => del.mutate()} />
    </div>
  );
}
