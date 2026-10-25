import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetClose = DialogPrimitive.Close;

export function SheetContent({
  className,
  children,
  width = "md",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { width?: "md" | "lg" | "xl" }) {
  const w = { md: "sm:max-w-md", lg: "sm:max-w-xl", xl: "sm:max-w-3xl" }[width];
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-navy-950/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card text-card-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200",
          w,
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted cursor-pointer">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex flex-col gap-1 border-b border-border px-5 py-4 pr-10", className)} {...props} />
);
export const SheetBody = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex-1 overflow-y-auto px-5 py-4 custom-scrollbar", className)} {...props} />
);
export const SheetFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div className={cn("flex gap-2 border-t border-border px-5 py-3 justify-end", className)} {...props} />
);
export const SheetTitle = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title className={cn("text-base font-semibold", className)} {...props} />
);
export const SheetDescription = ({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description className={cn("text-xs text-muted-foreground", className)} {...props} />
);
