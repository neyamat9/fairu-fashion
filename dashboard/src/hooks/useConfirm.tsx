import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
}

type Ask = (o: ConfirmOptions) => Promise<boolean>;
const Ctx = createContext<Ask | null>(null);

/**
 * One confirmation modal for the whole admin: `const confirm = useConfirm(); if (!(await confirm({ title: "Delete X?", destructive: true }))) return;`
 * Mounted once in AdminLayout, so every delete asks the same way.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback<Ask>((o) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpts(o);
    });
  }, []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  };

  return (
    <Ctx.Provider value={ask}>
      {children}
      <ConfirmDialog
        open={!!opts}
        onOpenChange={(o) => !o && settle(false)}
        title={opts?.title ?? ""}
        description={opts?.description}
        confirmLabel={opts?.confirmLabel ?? (opts?.destructive ? "Delete" : "Confirm")}
        destructive={opts?.destructive}
        onConfirm={() => settle(true)}
      />
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- the hook belongs with its provider
export function useConfirm(): Ask {
  const ask = useContext(Ctx);
  if (!ask) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ask;
}
