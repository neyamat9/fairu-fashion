import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...props }: React.ComponentProps<"table">) => (
  <div className="relative w-full overflow-x-auto custom-scrollbar">
    <table className={cn("w-full text-sm", className)} {...props} />
  </div>
);
export const TableHeader = ({ className, ...props }: React.ComponentProps<"thead">) => (
  <thead className={cn("bg-muted/50 text-muted-foreground", className)} {...props} />
);
export const TableBody = ({ className, ...props }: React.ComponentProps<"tbody">) => (
  <tbody className={cn("divide-y divide-border", className)} {...props} />
);
export const TableRow = ({ className, ...props }: React.ComponentProps<"tr">) => (
  <tr className={cn("transition-colors hover:bg-accent/40", className)} {...props} />
);
export const TableHead = ({ className, ...props }: React.ComponentProps<"th">) => (
  <th className={cn("h-10 px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap", className)} {...props} />
);
export const TableCell = ({ className, ...props }: React.ComponentProps<"td">) => (
  <td className={cn("px-3 py-3 align-middle", className)} {...props} />
);
