import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assetUrl } from "@/api/client";
import { productsApi, type ProductImage } from "@/api/products";
import { useAct } from "@/hooks/useAct";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// create mode: files are only collected (`staged`) and uploaded after the product exists.
export function PhotosEditor({ productId, images, staged, onStage }: { productId?: string; images?: ProductImage[]; staged: File[]; onStage: (f: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [del, setDel] = useState<ProductImage | null>(null);
  const inv = [["product", productId], ["products"]];
  const upload = useAct((files: File[]) => productsApi.uploadImages(productId!, files), { success: "Photos added", invalidate: inv });
  const main = useAct((id: string) => productsApi.updateImage(productId!, id, { isMain: true }), { invalidate: inv });
  const order = useAct((ids: string[]) => productsApi.reorderImages(productId!, ids), { invalidate: inv });
  const remove = useAct((id: string) => productsApi.removeImage(productId!, id), { success: "Photo removed", invalidate: inv, onSuccess: () => setDel(null) });

  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    if (productId) upload.mutate(files);
    else onStage([...staged, ...files].slice(0, 10));
    if (input.current) input.current.value = "";
  };
  const move = (i: number, d: number) => {
    const ids = (images ?? []).map((x) => x.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    order.mutate(ids);
  };

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-muted-foreground">JPG, PNG, WebP or GIF, up to 10 MB each. The first (starred) photo is the one shown in lists.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {(images ?? []).map((im, i) => (
          <div key={im.id} className="group relative overflow-hidden rounded border border-border bg-muted">
            <img src={assetUrl(im.url)} alt={im.alt ?? ""} className="aspect-square w-full object-cover" />
            {im.isMain && <span className="absolute left-1.5 top-1.5 rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">MAIN</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/70 p-1.5 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
              <div className="flex gap-1">
                <Button size="icon-xs" variant="secondary" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)}><ArrowLeft /></Button>
                <Button size="icon-xs" variant="secondary" aria-label="Move right" disabled={i === (images?.length ?? 0) - 1} onClick={() => move(i, 1)}><ArrowRight /></Button>
              </div>
              <div className="flex gap-1">
                {!im.isMain && <Button size="icon-xs" variant="secondary" aria-label="Make main" onClick={() => main.mutate(im.id)}><Star /></Button>}
                <Button size="icon-xs" variant="destructive" aria-label="Delete" onClick={() => setDel(im)}><Trash2 /></Button>
              </div>
            </div>
          </div>
        ))}
        {staged.map((f, i) => (
          <div key={f.name + i} className="relative overflow-hidden rounded border border-dashed border-orange-400 bg-muted">
            <img src={URL.createObjectURL(f)} alt="" className="aspect-square w-full object-cover" />
            <span className="absolute left-1.5 top-1.5 rounded bg-navy-800 px-1.5 py-0.5 text-[10px] font-bold text-white">{i === 0 ? "MAIN · " : ""}uploads on save</span>
            <Button size="icon-xs" variant="destructive" className="absolute right-1.5 top-1.5" aria-label="Remove" onClick={() => onStage(staged.filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
        ))}
        <button type="button" onClick={() => input.current?.click()} className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-border text-xs font-medium text-muted-foreground hover:border-orange-400 hover:text-orange-600">
          <ImagePlus className="size-6" />
          {upload.isPending ? "Uploading…" : "Add photos"}
        </button>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => pick(e.target.files)} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this photo?" confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => del && remove.mutate(del.id)} />
    </div>
  );
}
