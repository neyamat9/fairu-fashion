import { useRef, useState } from "react";
import { ImagePlus, Images, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assetUrl, errorMessage } from "@/api/client";
import { mediaApi, type MediaFolder } from "@/api/catalog";
import { Label } from "@/components/ui/input";

// Upload a new image, or pick one from the media library. Value is the stored URL.
export function ImageField({ label, value, onChange, folder = "general", className }: { label?: string; value: string | null | undefined; onChange: (url: string | null) => void; folder?: MediaFolder; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lib, setLib] = useState(false);
  const upload = async (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const [saved] = await mediaApi.upload([f], folder);
      onChange(saved.url);
    } catch (e) {
      toast.error(errorMessage(e, "Upload failed"));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  return (
    <div className={className}>
      {label && <Label className="mb-1 block">{label}</Label>}
      <div className="flex items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted">
          {value ? <img src={assetUrl(value)} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" loading={busy} onClick={() => input.current?.click()}><ImagePlus /> {value ? "Replace" : "Upload"}</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setLib(true)}><Images /> Library</Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}><Trash2 className="text-destructive" /> Remove</Button>}
        </div>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml" hidden onChange={(e) => void upload(e.target.files)} />
      {lib && <LibraryDialog onPick={(u) => { onChange(u); setLib(false); }} onClose={() => setLib(false)} />}
    </div>
  );
}

function LibraryDialog({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const q = useQuery({ queryKey: ["media", "picker"], queryFn: () => mediaApi.list({ limit: 60 }) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="xl">
        <DialogHeader><DialogTitle>Media library</DialogTitle></DialogHeader>
        <DialogBody>
          {q.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p> : (q.data?.data.length ?? 0) === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No images uploaded yet.</p> : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-6">
              {q.data?.data.map((m) => (
                <button key={m.id} type="button" onClick={() => onPick(m.url)} className="cursor-pointer overflow-hidden rounded border border-border hover:ring-2 hover:ring-orange-400">
                  <img src={assetUrl(m.thumbUrl ?? m.url)} alt={m.originalName} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
