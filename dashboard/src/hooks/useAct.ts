import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorMessage } from "@/api/client";

// A mutation that toasts the outcome and refreshes the lists it affects.
export function useAct<TVars = void, TData = unknown>(
  fn: (v: TVars) => Promise<TData>,
  opts: {
    success?: string | ((data: TData, v: TVars) => string);
    invalidate?: QueryKey[];
    onSuccess?: (data: TData, v: TVars) => void;
    silentError?: (e: unknown) => boolean;
  } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data, v) => {
      const msg = typeof opts.success === "function" ? opts.success(data, v) : opts.success;
      if (msg) toast.success(msg);
      for (const key of opts.invalidate ?? []) void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: ["attention-summary"] });
      opts.onSuccess?.(data, v);
    },
    onError: (e) => {
      if (!opts.silentError?.(e)) toast.error(errorMessage(e));
    },
  });
}
