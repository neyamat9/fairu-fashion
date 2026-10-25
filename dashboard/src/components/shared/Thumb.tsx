import { ImageOff } from "lucide-react";
import { assetUrl } from "@/api/client";
import { cn } from "@/lib/utils";

export function Thumb({ src, alt = "", className }: { src?: string | null; alt?: string; className?: string }) {
  return src ? (
    <img src={assetUrl(src)} alt={alt} loading="lazy" className={cn("size-10 rounded border border-border bg-muted object-cover", className)} />
  ) : (
    <div className={cn("flex size-10 items-center justify-center rounded border border-border bg-muted text-muted-foreground", className)}>
      <ImageOff className="size-4" />
    </div>
  );
}
