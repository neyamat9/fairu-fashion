import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;
export const TabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List className={cn("no-scrollbar flex w-full items-end gap-1 overflow-x-auto border-b border-border text-muted-foreground", className)} {...props} />
);
export const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "-mb-px inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap border-b-2 border-transparent px-3.5 pb-2.5 pt-2 text-[13px] font-medium outline-none transition-colors hover:text-foreground focus-visible:text-foreground data-[state=active]:border-brand data-[state=active]:font-semibold data-[state=active]:text-foreground",
      className,
    )}
    {...props}
  />
);
export const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} {...props} />
);
