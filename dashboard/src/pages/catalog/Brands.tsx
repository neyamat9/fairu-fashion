import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { brandsApi, slugify, type Brand } from "@/api/catalog";
import { errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/Field";
import { ImageField } from "@/components/shared/ImageField";
import { SortableList } from "@/components/shared/Sortable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Thumb } from "@/components/shared/Thumb";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";
import { useAct } from "@/hooks/useAct";
import { CardListSkeleton } from "@/components/shared/skeletons";

function BrandDialog({ brand, onClose }: { brand: Brand | null; onClose: () => void }) {
  const [f, setF] = useState({
    name: brand?.name ?? "", slug: brand?.slug ?? "", logo: brand?.logo ?? null as string | null, banner: brand?.banner ?? null as string | null,
    description: brand?.description ?? "", website: brand?.website ?? "", country: brand?.country ?? "", foundedYear: brand?.foundedYear ? String(brand.foundedYear) : "",
    isHomepage: brand?.isHomepage ?? false, status: brand?.status ?? "ACTIVE", metaTitle: brand?.metaTitle ?? "", metaDescription: brand?.metaDescription ?? "",
  });
  const [touched, setTouched] = useState(!!brand);
  const [err, setErr] = useState<string | null>(null);
  const save = useAct(
    () => {
      const b = {
        name: f.name.trim(), slug: f.slug.trim(), logo: f.logo ?? undefined, banner: f.banner ?? undefined, description: f.description || undefined,
        website: f.website || undefined, country: f.country || undefined, foundedYear: f.foundedYear ? Number(f.foundedYear) : undefined,
        isHomepage: f.isHomepage, status: f.status, metaTitle: f.metaTitle || undefined, metaDescription: f.metaDescription || undefined,
      };
      return brand ? brandsApi.update(brand.id, b) : brandsApi.create(b);
    },
    { success: "Brand saved", invalidate: [["brands"]], onSuccess: onClose },
  );
  const submit = () => {
    if (!f.name.trim()) return setErr("Name is required");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) return setErr("Slug: lowercase letters, numbers and dashes");
    if (f.foundedYear && !/^\d{4}$/.test(f.foundedYear)) return setErr("Founded year must be 4 digits");
    setErr(null);
    save.mutate();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>{brand ? "Edit brand" : "New brand"}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          {err && <p className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-destructive dark:bg-red-500/10">{err}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: touched ? f.slug : slugify(e.target.value) })} /></Field>
            <Field label="URL slug" required><Input value={f.slug} onChange={(e) => { setTouched(true); setF({ ...f, slug: e.target.value }); }} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ImageField label="Logo" folder="brands" value={f.logo} onChange={(logo) => setF({ ...f, logo })} />
            <ImageField label="Banner" folder="brands" value={f.banner} onChange={(banner) => setF({ ...f, banner })} />
          </div>
          <Field label="Description"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Website"><Input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://" /></Field>
            <Field label="Country"><Input value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} /></Field>
            <Field label="Founded"><Input value={f.foundedYear} onChange={(e) => setF({ ...f, foundedYear: e.target.value })} placeholder="2011" /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Meta title"><Input value={f.metaTitle} onChange={(e) => setF({ ...f, metaTitle: e.target.value })} /></Field>
            <Field label="Meta description"><Input value={f.metaDescription} onChange={(e) => setF({ ...f, metaDescription: e.target.value })} /></Field>
          </div>
          <div className="flex items-center gap-6">
            <Field label="Status" className="w-40"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "ACTIVE" | "INACTIVE" })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select></Field>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={f.isHomepage} onChange={(e) => setF({ ...f, isHomepage: e.target.checked })} />Feature on the home page</label>
          </div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Brands() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["brands"], queryFn: brandsApi.list });
  const [edit, setEdit] = useState<Brand | null | "new">(null);
  const [del, setDel] = useState<Brand | null>(null);
  const reorder = async (ids: string[]) => {
    const prev = qc.getQueryData<Brand[]>(["brands"]);
    if (prev) qc.setQueryData<Brand[]>(["brands"], ids.map((id) => prev.find((b) => b.id === id)!));
    try { await brandsApi.reorder(ids); } catch (e) { toast.error(errorMessage(e)); qc.setQueryData(["brands"], prev); }
  };
  const remove = useAct(() => brandsApi.remove(del!.id), { success: "Brand deleted", invalidate: [["brands"]], onSuccess: () => setDel(null) });
  if (q.isLoading) return <CardListSkeleton title="Brands" text="Drag to change the order shown on the website." action="New brand" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const brands = q.data ?? [];
  return (
    <div>
      <PageHeader title="Brands" description="Drag to change the order shown on the website." actions={<Button variant="brand" size="sm" onClick={() => setEdit("new")}><Plus /> New brand</Button>} />
      {brands.length === 0 ? <Card><EmptyState title="No brands yet" /></Card> : (
        <SortableList items={brands} onReorder={(ids) => void reorder(ids)}>
          {(b) => (
            <div className="flex items-center gap-3 py-2 pr-3">
              <Thumb src={b.logo} className="size-10" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 break-words text-[13px] font-semibold">{b.name} {b.isHomepage && <Badge variant="orange" className="ml-1">Home</Badge>}</p>
                <p className="text-[11px] text-muted-foreground">/{b.slug}{b.country ? ` · ${b.country}` : ""}</p>
              </div>
              <span className={b.status === "ACTIVE" ? "max-sm:hidden" : ""}><StatusBadge status={b.status} /></span>
              <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEdit(b)}><Pencil /></Button>
              <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel(b)}><Trash2 className="text-destructive" /></Button>
            </div>
          )}
        </SortableList>
      )}
      {edit && <BrandDialog brand={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete "${del?.name}"?`} description="Brands that still have products cannot be deleted." confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
