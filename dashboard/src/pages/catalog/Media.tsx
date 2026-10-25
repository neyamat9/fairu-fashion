import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Trash2, Upload } from "lucide-react";
import { MEDIA_FOLDERS, mediaApi, type MediaFile, type MediaFolder } from "@/api/catalog";
import { assetUrl, errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { InfiniteFooter } from "@/components/shared/DataTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime, titleCase } from "@/lib/format";

const kb = (n: number) => (n > 1_000_000 ? `${(n / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1000))} KB`);

function Details({ file, onClose }: { file: MediaFile; onClose: () => void }) {
  const usage = useQuery({ queryKey: ["media-usage", file.id], queryFn: () => mediaApi.usage(file.id) });
  const [force, setForce] = useState(false);
  const remove = useAct(() => mediaApi.remove(file.id, force), { success: "File deleted", invalidate: [["media"]], onSuccess: onClose });
  const used = (usage.data?.length ?? 0) > 0;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="truncate">{file.originalName}</DialogTitle>
          <DialogDescription>{file.width}×{file.height} · {kb(file.size)} · {titleCase(file.folder)} · {dateTime(file.createdAt)}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <img src={assetUrl(file.url)} alt="" className="max-h-72 w-full rounded border border-border bg-muted object-contain" />
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{file.url}</code>
            <Button size="xs" variant="outline" onClick={() => { void navigator.clipboard.writeText(assetUrl(file.url)); toast.success("Link copied"); }}><Copy /> Copy link</Button>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold">Used in</p>
            {usage.isLoading ? <Skeleton className="h-8" /> : used ? (
              <ul className="space-y-1 text-[13px]">{usage.data!.map((u, i) => <li key={i} className="rounded bg-muted px-2 py-1">{titleCase(u.type)}: <b>{u.label}</b> <span className="text-muted-foreground">({u.field})</span></li>)}</ul>
            ) : <p className="text-[13px] text-muted-foreground">Not used anywhere — safe to delete.</p>}
            {used && (
              <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-destructive"><input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />Delete anyway (those places will lose the image)</label>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="destructive" loading={remove.isPending} disabled={used && !force} onClick={() => remove.mutate()}><Trash2 /> Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Media() {
  const [f, setF] = useUrlState({ folder: "", search: "", page: "1" });
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [sel, setSel] = useState<MediaFile | null>(null);
  const [folder, setFolder] = useState<MediaFolder>("general");
  const input = useRef<HTMLInputElement>(null);
  const q = useInfiniteList(["media", f.folder, search], (page) => mediaApi.list({ folder: f.folder || undefined, search: search || undefined, page, limit: 24 }));
  const upload = useAct((files: File[]) => mediaApi.upload(files, folder), { success: (r) => `${r.length} file(s) uploaded`, invalidate: [["media"]] });

  return (
    <div>
      <PageHeader
        title="Media library"
        description="Images you uploaded. Use them on products, banners, brands and categories."
        actions={
          <>
            <Select value={folder} onChange={(e) => setFolder(e.target.value as MediaFolder)} className="w-auto" aria-label="Upload folder">{MEDIA_FOLDERS.map((m) => <option key={m} value={m}>Into: {titleCase(m)}</option>)}</Select>
            <Button variant="brand" size="sm" loading={upload.isPending} onClick={() => input.current?.click()}><Upload /> Upload</Button>
            <input ref={input} type="file" hidden multiple accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => { const l = Array.from(e.target.files ?? []); if (l.length) upload.mutate(l); e.target.value = ""; }} />
          </>
        }
      />
      <Card>
        <FilterBar>
          <SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="File name…" />
          <FilterSelect value={f.folder} onChange={(v) => setF({ folder: v })} all="All folders" options={MEDIA_FOLDERS.map((m) => ({ value: m, label: titleCase(m) }))} />
        </FilterBar>
        {q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : q.isLoading ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
        ) : q.rows.length === 0 ? <EmptyState title="No images" description="Upload some to build your library." /> : (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
            {q.rows.map((m) => (
              <button key={m.id} onClick={() => setSel(m)} className="group cursor-pointer overflow-hidden rounded border border-border text-left hover:ring-2 hover:ring-orange-400">
                <img src={assetUrl(m.thumbUrl ?? m.url)} alt={m.originalName} className="aspect-square w-full bg-muted object-cover" loading="lazy" />
                <p className="truncate px-2 py-1 text-[11px] text-muted-foreground">{m.originalName}</p>
              </button>
            ))}
          </div>
        )}
        {q.rows.length > 0 && <InfiniteFooter list={q} />}
      </Card>
      {sel && <Details file={sel} onClose={() => setSel(null)} />}
    </div>
  );
}
