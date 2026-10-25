import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadFile, errorMessage } from "@/api/client";

export function DownloadButton({
  path,
  params,
  filename,
  label = "Export CSV",
  size = "sm",
}: {
  path: string;
  params?: Record<string, unknown>;
  filename?: string;
  label?: string;
  size?: "sm" | "default" | "xs";
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size={size}
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadFile(path, params, filename);
        } catch (e) {
          toast.error(errorMessage(e, "Download failed"));
        } finally {
          setBusy(false);
        }
      }}
    >
      {!busy && <Download />}
      {label}
    </Button>
  );
}
