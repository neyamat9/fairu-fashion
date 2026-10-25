import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const auto = useId();
  // Tie the label to the control so clicking it focuses the input and screen readers announce it.
  const single = isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const id = single?.props.id ?? auto;
  const control = single && !single.props.id ? cloneElement(single, { id }) : children;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <Label htmlFor={single ? id : undefined}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {control}
      {error ? <p className="text-[11px] font-medium text-destructive">{error}</p> : hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Section({ title, description, actions, children, className }: { title: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded border border-border bg-card shadow-card", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <div>
          <h3 className="font-heading text-[15px] font-semibold tracking-tight">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function KeyValue({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 py-1.5 text-[13px]", className)}>
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}
