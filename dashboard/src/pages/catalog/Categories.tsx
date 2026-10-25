import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { categoriesApi, slugify, subCategoriesApi, type Category, type SubCategory } from "@/api/catalog";
import { errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/Field";
import { ImageField } from "@/components/shared/ImageField";
import { SortableList } from "@/components/shared/Sortable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Thumb } from "@/components/shared/Thumb";
import { ErrorState, EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useAct } from "@/hooks/useAct";
import { CardListSkeleton } from "@/components/shared/skeletons";

type Edit = { kind: "category"; item: Category | null } | { kind: "sub"; item: SubCategory | null; parentId?: string };

function EditDialog({ edit, categories, onClose }: { edit: Edit; categories: Category[]; onClose: () => void }) {
  const it = edit.item;
  const isSub = edit.kind === "sub";
  const [f, setF] = useState({
    name: it?.name ?? "", slug: it?.slug ?? "", description: it?.description ?? "", image: it?.image ?? null as string | null,
    isHomepage: it?.isHomepage ?? false, status: it?.status ?? "ACTIVE",
    parentCategoryId: (it as SubCategory | null)?.parentCategoryId ?? (edit.kind === "sub" ? edit.parentId ?? "" : ""),
    metaTitle: (it as Category | null)?.metaTitle ?? "", metaDescription: (it as Category | null)?.metaDescription ?? "",
  });
  const [touched, setTouched] = useState(!!it);
  const [err, setErr] = useState<string | null>(null);
  const save = useAct<void, unknown>(
    () => {
      const base = { name: f.name.trim(), slug: f.slug.trim(), description: f.description.trim() || undefined, image: f.image ?? undefined, isHomepage: f.isHomepage, status: f.status };
      if (isSub) {
        const b = { ...base, parentCategoryId: f.parentCategoryId };
        return it ? subCategoriesApi.update(it.id, b) : subCategoriesApi.create(b);
      }
      const b = { ...base, metaTitle: f.metaTitle || undefined, metaDescription: f.metaDescription || undefined };
      return it ? categoriesApi.update(it.id, b) : categoriesApi.create(b);
    },
    { success: "Saved", invalidate: [["categories"], ["sub-categories"]], onSuccess: onClose },
  );
  const submit = () => {
    if (!f.name.trim()) return setErr("Name is required");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) return setErr("Slug: lowercase letters, numbers and dashes");
    if (isSub && !f.parentCategoryId) return setErr("Choose the parent category");
    setErr(null);
    save.mutate();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader><DialogTitle>{it ? "Edit" : "New"} {isSub ? "sub-category" : "category"}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          {err && <p className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-destructive dark:bg-red-500/10">{err}</p>}
          {isSub && (
            <Field label="Parent category" required>
              <Select value={f.parentCategoryId} onChange={(e) => setF({ ...f, parentCategoryId: e.target.value })}>
                <option value="">Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: touched ? f.slug : slugify(e.target.value) })} /></Field>
            <Field label="URL slug" required><Input value={f.slug} onChange={(e) => { setTouched(true); setF({ ...f, slug: e.target.value }); }} /></Field>
          </div>
          <Field label="Description"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <ImageField label="Image" folder="categories" value={f.image} onChange={(image) => setF({ ...f, image })} />
          {!isSub && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Meta title"><Input value={f.metaTitle} onChange={(e) => setF({ ...f, metaTitle: e.target.value })} /></Field>
              <Field label="Meta description"><Input value={f.metaDescription} onChange={(e) => setF({ ...f, metaDescription: e.target.value })} /></Field>
            </div>
          )}
          <div className="flex items-center gap-6">
            <Field label="Status" className="w-40">
              <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "ACTIVE" | "INACTIVE" })}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select>
            </Field>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={f.isHomepage} onChange={(e) => setF({ ...f, isHomepage: e.target.checked })} />Show on the home page</label>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={save.isPending} onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Categories() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [edit, setEdit] = useState<Edit | null>(null);
  const [del, setDel] = useState<{ kind: "category" | "sub"; id: string; name: string } | null>(null);

  const reorder = async (ids: string[], sub?: string) => {
    const prev = qc.getQueryData<Category[]>(["categories"]);
    if (prev) {
      qc.setQueryData<Category[]>(["categories"], sub
        ? prev.map((c) => (c.id === sub ? { ...c, subCategories: ids.map((id) => c.subCategories.find((s) => s.id === id)!) } : c))
        : ids.map((id) => prev.find((c) => c.id === id)!));
    }
    try {
      await (sub ? subCategoriesApi.reorder(ids) : categoriesApi.reorder(ids));
    } catch (e) {
      toast.error(errorMessage(e));
      qc.setQueryData(["categories"], prev);
    }
  };
  const remove = useAct(() => (del!.kind === "sub" ? subCategoriesApi.remove(del!.id) : categoriesApi.remove(del!.id)), { success: "Deleted", invalidate: [["categories"]], onSuccess: () => setDel(null) });

  if (q.isLoading) return <CardListSkeleton title="Categories" text="Drag to change the order shown on the website." action="New category" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const cats = q.data ?? [];

  return (
    <div>
      <PageHeader title="Categories" description="Drag to change the order shown on the website." actions={<Button variant="brand" size="sm" onClick={() => setEdit({ kind: "category", item: null })}><Plus /> New category</Button>} />
      {cats.length === 0 ? <Card><EmptyState title="No categories yet" description="Create one to start adding products." /></Card> : (
        <SortableList items={cats} onReorder={(ids) => void reorder(ids)}>
          {(c) => (
            <div>
              <div className="flex items-center gap-3 py-2 pr-3">
                <button className="cursor-pointer text-muted-foreground" onClick={() => setOpen({ ...open, [c.id]: !open[c.id] })} aria-label="Toggle sub-categories">
                  {open[c.id] ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                <Thumb src={c.image} className="size-10" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 break-words text-[13px] font-semibold">{c.name} {c.isHomepage && <Badge variant="orange" className="ml-1">Home</Badge>}</p>
                  <p className="text-[11px] text-muted-foreground">/{c.slug} · {c.subCategories.length} sub-categories</p>
                </div>
                <span className={c.status === "ACTIVE" ? "max-sm:hidden" : ""}><StatusBadge status={c.status} /></span>
                <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEdit({ kind: "category", item: c })}><Pencil /></Button>
                <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel({ kind: "category", id: c.id, name: c.name })}><Trash2 className="text-destructive" /></Button>
              </div>
              {open[c.id] && (
                <div className="border-t border-border bg-muted/30 p-3 pl-10">
                  {c.subCategories.length > 0 && (
                    <SortableList items={c.subCategories} onReorder={(ids) => void reorder(ids, c.id)}>
                      {(s) => (
                        <div className="flex items-center gap-3 py-1.5 pr-3">
                          <Thumb src={s.image} className="size-8" />
                          <div className="min-w-0 flex-1"><p className="line-clamp-2 break-words text-[13px] font-medium">{s.name}</p><p className="text-[11px] text-muted-foreground">/{s.slug}</p></div>
                          <StatusBadge status={s.status} />
                          <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEdit({ kind: "sub", item: s })}><Pencil /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel({ kind: "sub", id: s.id, name: s.name })}><Trash2 className="text-destructive" /></Button>
                        </div>
                      )}
                    </SortableList>
                  )}
                  <Button size="xs" variant="outline" className="mt-2" onClick={() => setEdit({ kind: "sub", item: null, parentId: c.id })}><Plus /> Add sub-category</Button>
                </div>
              )}
            </div>
          )}
        </SortableList>
      )}
      {edit && <EditDialog edit={edit} categories={cats} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title={`Delete "${del?.name}"?`} description="Categories that still have products cannot be deleted — move those products first." confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
