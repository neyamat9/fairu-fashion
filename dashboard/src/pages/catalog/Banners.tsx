import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { BANNER_LINKS, BANNER_POSITIONS, bannersApi, type Banner, type BannerPosition } from "@/api/catalog";
import { assetUrl, errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Switch } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/Field";
import { ImageField } from "@/components/shared/ImageField";
import { SortableList } from "@/components/shared/Sortable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";
import { useAct } from "@/hooks/useAct";
import { dateOnly, fromLocalInput, titleCase, toLocalInput } from "@/lib/format";
import { CardListSkeleton } from "@/components/shared/skeletons";

const SIZE_HINT: Record<BannerPosition, string> = {
  HERO_MAIN: "Big slider on top, about 1200×400", HERO_SIDE: "Beside the slider", HERO_BOTTOM: "Under the slider", CATEGORY_TOP: "Top of category pages",
  CATEGORY_BANNER: "Inside category pages", PROMO_BAR: "Thin strip on top of the site", POPUP: "Pop-up when the site opens", SIDEBAR: "Sidebar banner",
};

function BannerDialog({ banner, defaultPosition, onClose }: { banner: Banner | null; defaultPosition: BannerPosition; onClose: () => void }) {
  const [f, setF] = useState({
    title: banner?.title ?? "", subtitle: banner?.subtitle ?? "", imageUrl: banner?.imageUrl ?? null as string | null, mobileImageUrl: banner?.mobileImageUrl ?? null as string | null,
    linkType: banner?.linkType ?? "CUSTOM", linkUrl: banner?.linkUrl ?? "", linkResourceId: banner?.linkResourceId ?? "",
    position: banner?.position ?? defaultPosition, isActive: banner?.isActive ?? true,
    startDate: toLocalInput(banner?.startDate), endDate: toLocalInput(banner?.endDate), bgColor: banner?.bgColor ?? "", textColor: banner?.textColor ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const save = useAct(
    () => {
      const b = {
        title: f.title, subtitle: f.subtitle, imageUrl: f.imageUrl ?? "", mobileImageUrl: f.mobileImageUrl ?? "", linkType: f.linkType, linkUrl: f.linkUrl, linkResourceId: f.linkResourceId,
        position: f.position, isActive: f.isActive, startDate: fromLocalInput(f.startDate), endDate: fromLocalInput(f.endDate), bgColor: f.bgColor, textColor: f.textColor,
      };
      return banner ? bannersApi.update(banner.id, b) : bannersApi.create(b);
    },
    { success: "Banner saved", invalidate: [["banners"]], onSuccess: onClose },
  );
  const submit = () => {
    if (!f.imageUrl) return setErr("Add the banner image");
    if (f.startDate && f.endDate && new Date(f.endDate) <= new Date(f.startDate)) return setErr("The end must be after the start");
    setErr(null);
    save.mutate();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>{banner ? "Edit banner" : "New banner"}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          {err && <p className="rounded bg-red-50 px-3 py-2 text-xs font-medium text-destructive dark:bg-red-500/10">{err}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <ImageField label="Image *" folder="banners" value={f.imageUrl} onChange={(imageUrl) => setF({ ...f, imageUrl })} />
            <ImageField label="Mobile image (optional)" folder="banners" value={f.mobileImageUrl} onChange={(mobileImageUrl) => setF({ ...f, mobileImageUrl })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Subtitle"><Input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Where it shows" hint={SIZE_HINT[f.position]}>
              <Select value={f.position} onChange={(e) => setF({ ...f, position: e.target.value as BannerPosition })}>{BANNER_POSITIONS.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}</Select>
            </Field>
            <Field label="Link to">
              <Select value={f.linkType} onChange={(e) => setF({ ...f, linkType: e.target.value as typeof f.linkType })}>{BANNER_LINKS.map((p) => <option key={p} value={p}>{titleCase(p)}</option>)}</Select>
            </Field>
            {f.linkType === "CUSTOM" ? (
              <Field label="Link address"><Input value={f.linkUrl} onChange={(e) => setF({ ...f, linkUrl: e.target.value })} placeholder="/shop or https://…" /></Field>
            ) : (
              <Field label={`${titleCase(f.linkType)} ID`}><Input value={f.linkResourceId} onChange={(e) => setF({ ...f, linkResourceId: e.target.value })} /></Field>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Show from" hint="Empty = right away"><Input type="datetime-local" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
            <Field label="Show until" hint="Empty = no end"><Input type="datetime-local" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Background colour"><Input value={f.bgColor} onChange={(e) => setF({ ...f, bgColor: e.target.value })} placeholder="#053972" /></Field>
            <Field label="Text colour"><Input value={f.textColor} onChange={(e) => setF({ ...f, textColor: e.target.value })} placeholder="#ffffff" /></Field>
            <label className="mt-6 flex cursor-pointer items-center gap-2 text-[13px]"><Switch checked={f.isActive} onCheckedChange={(isActive) => setF({ ...f, isActive })} />Active</label>
          </div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={save.isPending} onClick={submit}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Banners() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["banners"], queryFn: bannersApi.list });
  const [edit, setEdit] = useState<{ banner: Banner | null; position: BannerPosition } | null>(null);
  const [del, setDel] = useState<Banner | null>(null);
  const toggle = useAct((b: Banner) => bannersApi.update(b.id, { isActive: !b.isActive }), { invalidate: [["banners"]] });
  const remove = useAct(() => bannersApi.remove(del!.id), { success: "Banner deleted", invalidate: [["banners"]], onSuccess: () => setDel(null) });

  const reorder = async (position: BannerPosition, ids: string[]) => {
    const prev = qc.getQueryData<Banner[]>(["banners"]);
    if (prev) {
      const others = prev.filter((b) => b.position !== position);
      qc.setQueryData<Banner[]>(["banners"], [...others, ...ids.map((id) => prev.find((b) => b.id === id)!)]);
    }
    try { await bannersApi.reorder(position, ids); } catch (e) { toast.error(errorMessage(e)); qc.setQueryData(["banners"], prev); }
  };

  if (q.isLoading) return <CardListSkeleton title="Banners" text="Home page sliders and promotions. Drag inside a group to change the order." action="New banner" />;
  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const all = q.data ?? [];
  const positions = BANNER_POSITIONS.filter((p) => all.some((b) => b.position === p));

  return (
    <div>
      <PageHeader title="Banners" description="Home page sliders and promotions. Drag inside a group to change the order." actions={<Button variant="brand" size="sm" onClick={() => setEdit({ banner: null, position: "HERO_MAIN" })}><Plus /> New banner</Button>} />
      {all.length === 0 ? <Card><EmptyState title="No banners yet" description="Add a banner to show on the home page." /></Card> : (
        <div className="space-y-6">
          {positions.map((pos) => {
            const list = all.filter((b) => b.position === pos).sort((a, b) => a.displayOrder - b.displayOrder);
            return (
              <section key={pos}>
                <div className="mb-2 flex items-center justify-between">
                  <div><h2 className="text-sm font-semibold">{titleCase(pos)}</h2><p className="text-xs text-muted-foreground">{SIZE_HINT[pos]}</p></div>
                  <Button size="xs" variant="outline" onClick={() => setEdit({ banner: null, position: pos })}><Plus /> Add</Button>
                </div>
                <SortableList items={list} onReorder={(ids) => void reorder(pos, ids)}>
                  {(b) => (
                    <div className="flex items-center gap-3 py-2 pr-3">
                      <img src={assetUrl(b.imageUrl)} alt="" className="h-14 w-28 shrink-0 rounded object-cover bg-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{b.title || "(no title)"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{b.linkUrl || b.linkResourceId || "No link"}{(b.startDate || b.endDate) && ` · ${b.startDate ? dateOnly(b.startDate) : "…"} → ${b.endDate ? dateOnly(b.endDate) : "…"}`}</p>
                      </div>
                      {b.endDate && new Date(b.endDate) < new Date() && <Badge variant="neutral">Expired</Badge>}
                      <Switch checked={b.isActive} onCheckedChange={() => toggle.mutate(b)} aria-label="Active" />
                      <Button size="icon-sm" variant="ghost" aria-label="Edit" onClick={() => setEdit({ banner: b, position: b.position })}><Pencil /></Button>
                      <Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel(b)}><Trash2 className="text-destructive" /></Button>
                    </div>
                  )}
                </SortableList>
              </section>
            );
          })}
        </div>
      )}
      {edit && <BannerDialog banner={edit.banner} defaultPosition={edit.position} onClose={() => setEdit(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this banner?" confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
