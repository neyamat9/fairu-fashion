import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CheckCheck, Upload } from "lucide-react";
import { PageHeader } from "./PageHeader";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Loading placeholders shaped like the real pages (same header, cards, columns and spacing),
 * so nothing jumps when the data arrives. Each one is used both while a page's code loads and while its data loads.
 */

export function HeaderSkeleton({ actions = 1, back, description = true, title, text, buttons }: { actions?: number; back?: boolean; description?: boolean; title?: string; text?: string; buttons?: ReactNode }) {
  // known pages show their real title and subtitle; only the data-dependent bits are grey
  if (title) return <PageHeader title={title} description={text} actions={buttons} />;
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between" aria-hidden="true">
      <div className="min-w-0 space-y-2">
        {back && <Skeleton className="h-3.5 w-20" />}
        <Skeleton className="h-7 w-44" />
        {description && <Skeleton className="h-3.5 w-72 max-w-full" />}
      </div>
      {actions > 0 && (
        <div className="flex gap-2">
          {Array.from({ length: actions }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28" />
          ))}
        </div>
      )}
    </div>
  );
}

export function StatCardsSkeleton({ n = 4, className }: { n?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 xl:grid-cols-4", className)} aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <Card key={i} className="flex items-start justify-between gap-3 p-4">
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-9" />
        </Card>
      ))}
    </div>
  );
}

function FilterRowSkeleton({ n = 5 }: { n?: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-3" aria-hidden="true">
      <Skeleton className="h-9 w-full sm:w-64" />
      <Skeleton className="h-9 w-24 md:hidden" />
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton key={i} className="hidden h-9 w-32 md:block" />
      ))}
    </div>
  );
}

/** Table on tablets and up, small cards on phones: the same switch the real lists make. */
export function ListRowsSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      <ul className="divide-y divide-border md:hidden" aria-hidden="true">
        {Array.from({ length: Math.min(rows, 5) }).map((_, i) => (
          <li key={i} className="space-y-2 px-3 py-3">
            <div className="flex justify-between gap-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-5 w-16" /></div>
            <div className="grid grid-cols-2 gap-3"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
            <Skeleton className="h-4 w-1/3" />
          </li>
        ))}
      </ul>
      <div className="hidden md:block" aria-hidden="true">
        <div className="flex gap-6 bg-muted/60 px-3 py-2.5">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className={cn("h-3", i === 0 ? "w-24" : "w-16")} />
          ))}
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-3 py-3.5">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton key={c} className={cn("h-4", c === 0 ? "w-32" : c === 1 ? "w-44" : "w-20")} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Any list page: header + (optional stat cards) + filter bar + rows. */
export function ListPageSkeleton({ stats = 0, actions = 1, filters = 5, rows = 8, cols = 6 }: { stats?: number; actions?: number; filters?: number; rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton actions={actions} />
      {stats > 0 && <StatCardsSkeleton n={stats} className="mb-4" />}
      <Card className="overflow-hidden">
        <FilterRowSkeleton n={filters} />
        <ListRowsSkeleton rows={rows} cols={cols} />
      </Card>
    </div>
  );
}

export function SectionCardSkeleton({ rows = 3, title = true, className, children }: { rows?: number; title?: boolean; className?: string; children?: ReactNode }) {
  return (
    <section className={cn("rounded border border-border bg-card", className)} aria-hidden="true">
      {title && (
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <div className="space-y-3 p-4">
        {children ??
          Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
      </div>
    </section>
  );
}

/** Dashboard home. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-5 pb-8" role="status" aria-label="Loading">
      <HeaderSkeleton actions={2} />
      <StatCardsSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <Skeleton className="mb-1 h-4 w-32" />
          <Skeleton className="mb-4 h-3 w-56" />
          <Skeleton className="h-72 w-full" />
        </Card>
        <Card className="space-y-3 p-4">
          <Skeleton className="h-4 w-36" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-5 w-8" /></div>
          ))}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="space-y-3 p-4">
            <Skeleton className="h-4 w-28" />
            {Array.from({ length: 4 }).map((_, r) => (
              <div key={r} className="flex items-center gap-3"><Skeleton className="size-9 shrink-0" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-3/4" /><Skeleton className="h-3 w-1/3" /></div><Skeleton className="h-4 w-14" /></div>
            ))}
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-4 lg:col-span-2">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3"><Skeleton className="h-9 w-1/2" /><Skeleton className="h-5 w-24" /><Skeleton className="h-5 w-16" /></div>
          ))}
        </Card>
        <Card className="space-y-3 p-4"><Skeleton className="h-4 w-24" /><Skeleton className="h-40 w-full" /></Card>
      </div>
    </div>
  );
}

/** Order detail / customer detail / ticket: header + main column + side column. */
export function DetailPageSkeleton({ back = true }: { back?: boolean }) {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton back={back} actions={3} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCardSkeleton>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3"><Skeleton className="size-12 shrink-0" /><div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/4" /></div><Skeleton className="h-4 w-16" /></div>
            ))}
          </SectionCardSkeleton>
          <SectionCardSkeleton rows={5} />
          <SectionCardSkeleton rows={3} />
        </div>
        <div className="space-y-4">
          <SectionCardSkeleton rows={4} />
          <SectionCardSkeleton rows={3} />
          <SectionCardSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}

/** Settings, profile, the product editor: tabs and form sections. */
export function FormPageSkeleton({ tabs = 5, sections = 2, back, title, text, tabNames }: { tabs?: number; sections?: number; back?: boolean; title?: string; text?: string; tabNames?: string[] }) {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton back={back} actions={1} title={title} text={text} />
      {tabNames ? (
        <Tabs value={tabNames[0]}>
          <TabsList className="mb-4">
            {tabNames.map((t) => (
              <TabsTrigger key={t} value={t}>
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : (
        tabs > 0 && (
          <div className="mb-4 flex gap-1 rounded bg-muted p-1 sm:w-fit">
            {Array.from({ length: tabs }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 bg-card" />
            ))}
          </div>
        )
      )}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {Array.from({ length: sections }).map((_, s) => (
          <SectionCardSkeleton key={s}>
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-9 w-full" /></div>
              ))}
            </div>
            <div className="space-y-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-20 w-full" /></div>
          </SectionCardSkeleton>
        ))}
      </div>
    </div>
  );
}

/** Categories, brands, banners: a list of rows with a picture. */
export function CardListSkeleton({ rows = 6, title, text, action }: { rows?: number; title?: string; text?: string; action?: string }) {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton
        actions={1}
        title={title}
        text={text}
        buttons={
          action ? (
            <Button size="sm" variant="brand" disabled className="disabled:opacity-100">
              <Plus /> {action}
            </Button>
          ) : undefined
        }
      />
      <Card className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="size-5 shrink-0" />
            <Skeleton className="size-12 shrink-0" />
            <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/5" /></div>
            <Skeleton className="hidden h-5 w-16 sm:block" />
            <Skeleton className="size-8" />
          </div>
        ))}
      </Card>
    </div>
  );
}

/** Media library. */
export function GridPageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton
        title="Media library"
        text="Images you uploaded. Use them on products, banners, brands and categories."
        buttons={
          <>
            <Select value="g" disabled className="w-auto">
              <option value="g">Into: General</option>
            </Select>
            <Button size="sm" variant="brand" disabled className="disabled:opacity-100">
              <Upload /> Upload
            </Button>
          </>
        }
      />
      <Card className="overflow-hidden">
        <FilterRowSkeleton n={1} />
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </Card>
    </div>
  );
}

/** Notifications and other "feed" pages. */
export function FeedPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton
        title="Notifications"
        text="Real-time alerts for orders, stock thresholds, payments and customer care."
        buttons={
          <Button size="sm" variant="outline" disabled className="disabled:opacity-100">
            <CheckCheck /> Mark all read
          </Button>
        }
      />
      <div className="mb-4 flex gap-2"><Skeleton className="h-8 w-24" /><Skeleton className="h-8 w-24" /><Skeleton className="ml-auto h-8 w-32" /></div>
      <Card className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <Skeleton className="size-9 shrink-0" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-3/4" /></div>
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </Card>
    </div>
  );
}

/** Reports: tabs, a few numbers, a chart and a table. */
export function ReportsSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <HeaderSkeleton title="Reports" text="Preview here, then download for Excel or CSV." />
      <div className="mb-4 flex gap-1 rounded bg-muted p-1 sm:w-fit">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-24 bg-card" />)}</div>
      <StatCardsSkeleton className="mb-4" />
      <Card className="mb-4 p-4"><Skeleton className="h-64 w-full" /></Card>
      <Card className="overflow-hidden"><ListRowsSkeleton rows={6} cols={5} /></Card>
    </div>
  );
}
