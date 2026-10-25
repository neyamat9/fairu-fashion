import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast !bg-card !text-foreground !border-border !shadow-lg",
          description: "!text-muted-foreground",
          actionButton: "!bg-brand !text-brand-foreground font-medium",
          cancelButton: "!bg-muted !text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}
