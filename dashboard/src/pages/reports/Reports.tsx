import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";
import { REPORTS, reportsApi, type ReportTable } from "@/api/system";
import { errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { DateInput, FilterBar, FilterSelect } from "@/components/shared/FilterBar";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { ErrorState } from "@/components/shared/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUrlState } from "@/hooks/useUrlState";
import { dateOnly, isoDay, money, num } from "@/lib/format";
import { subDays } from "date-fns";
import { cn } from "@/lib/utils";

const cell = (type: string | undefined, v: unknown) => {
  if (v === null || v === undefined || v === "") return "—";
  switch (type) {
    case "money": return money(v as number);
    case "int": return num(v as number);
    case "number": return Number(v).toLocaleString("en-BD", { maximumFractionDigits: 2 });
    case "percent": return `${Number(v).toFixed(1)}%`;
    case "date": return dateOnly(v as string);
    default: return String(v);
  }
};

function Preview({ t }: { t: ReportTable }) {
  return (
    <Card className="overflow-hidden">
      {t.meta && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          {Object.entries(t.meta).filter(([k]) => k !== "From" && k !== "To").map(([k, v]) => <span key={k}><b className="text-foreground">{k}:</b> {String(v)}</span>)}
        </div>
      )}
      <div className="max-h-[560px] overflow-auto custom-scrollbar">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>{t.columns.map((c) => <TableHead key={c.key} className={cn(c.type && c.type !== "text" && c.type !== "date" && "text-right")}>{c.header}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {t.rows.length === 0 && <TableRow><TableCell colSpan={t.columns.length} className="py-10 text-center text-muted-foreground">No data in this range.</TableCell></TableRow>}
            {t.rows.map((r, i) => (
              <TableRow key={i}>{t.columns.map((c) => <TableCell key={c.key} className={cn(c.type && c.type !== "text" && c.type !== "date" && "text-right tabular-nums")}>{cell(c.type, r[c.key])}</TableCell>)}</TableRow>
            ))}
            {t.totals && t.rows.length > 0 && (
              <TableRow className="bg-muted/60 font-bold hover:bg-muted/60">{t.columns.map((c) => <TableCell key={c.key} className={cn(c.type && c.type !== "text" && c.type !== "date" && "text-right tabular-nums")}>{cell(c.type, t.totals![c.key])}</TableCell>)}</TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export default function Reports() {
  const today = new Date();
  const [f, setF] = useUrlState({ report: "sales", from: isoDay(subDays(today, 29)), to: isoDay(today), granularity: "", includeUnsold: "true" });
  const def = REPORTS.find((r) => r.id === f.report) ?? REPORTS[0];
  const params = { from: f.from, to: f.to, ...(def.id === "sales" && f.granularity ? { granularity: f.granularity } : {}), ...(def.id === "products" ? { includeUnsold: f.includeUnsold } : {}) };
  const q = useQuery({ queryKey: ["report", def.id, params], queryFn: () => reportsApi.run(def.path, def.range ? params : {}) });
  const bad = def.range && f.from && f.to && f.to < f.from;
  const range = (days: number) => setF({ from: isoDay(subDays(today, days - 1)), to: isoDay(today) });

  return (
    <div>
      <PageHeader title="Reports" description="Preview here, then download for Excel or CSV." />
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {REPORTS.map((r) => (
          <button key={r.id} onClick={() => setF({ report: r.id })} className={cn("cursor-pointer rounded border p-3 text-left transition", r.id === def.id ? "border-orange-400 bg-orange-50 shadow-xs dark:bg-orange-500/10" : "border-border bg-card hover:border-navy-300")}>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold"><FileSpreadsheet className="size-4 text-orange-500" />{r.label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{r.hint}</p>
          </button>
        ))}
      </div>
      <Card className="mb-4 overflow-hidden">
        <FilterBar className="border-b-0">
          {def.range ? (
            <>
              <DateInput label="From" value={f.from} onChange={(v) => setF({ from: v })} />
              <DateInput label="To" value={f.to} onChange={(v) => setF({ to: v })} />
              <div className="flex gap-1">{[[7, "7 days"], [30, "30 days"], [90, "90 days"]].map(([d, l]) => <Button key={d} size="xs" variant="outline" onClick={() => range(d as number)}>{l}</Button>)}</div>
              {def.id === "sales" && <FilterSelect value={f.granularity} onChange={(v) => setF({ granularity: v })} all="Auto grouping" options={[{ value: "day", label: "By day" }, { value: "week", label: "By week" }, { value: "month", label: "By month" }]} />}
              {def.id === "products" && <FilterSelect value={f.includeUnsold} onChange={(v) => setF({ includeUnsold: v })} all={null} options={[{ value: "true", label: "Include unsold products" }, { value: "false", label: "Only products that sold" }]} />}
            </>
          ) : <p className="text-[13px] text-muted-foreground">This report shows your stock as it is right now.</p>}
          <div className="ml-auto flex gap-2">
            <DownloadButton path={def.path} params={{ ...(def.range ? params : {}), format: "csv" }} filename={`${def.id}.csv`} label="CSV" />
            <DownloadButton path={def.path} params={{ ...(def.range ? params : {}), format: "xlsx" }} filename={`${def.id}.xlsx`} label="Excel" />
          </div>
        </FilterBar>
      </Card>
      {bad ? <ErrorState message="The end date is before the start date." /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} /> : q.isLoading ? <Skeleton className="h-64" /> : <Preview t={q.data!} />}
      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Download className="size-3" /> Downloads include the same rows and totals.</p>
    </div>
  );
}
