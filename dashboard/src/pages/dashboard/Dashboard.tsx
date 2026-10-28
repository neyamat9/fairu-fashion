import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Banknote, PackageCheck, ShoppingBag, TrendingUp, UserPlus, Wallet, Clock } from "lucide-react";
import { subDays } from "date-fns";
import { dashboardApi, type Granularity } from "@/api/dashboard";
import { notificationsApi } from "@/api/notifications";
import { errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Thumb } from "@/components/shared/Thumb";
import { ErrorState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { dateOnly, isoDay, money, num, timeAgo, titleCase } from "@/lib/format";
import { useUi } from "@/store/ui";

const RANGES = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];
const PIE = ["#ba3d5d", "#e06d88", "#7a1b34", "#f495af", "#d16283", "#eb688c"];

export default function Dashboard() {
  const navigate = useNavigate();
  const dark = useUi((s) => s.dark);
  const [days, setDays] = useState("30");
  const [gran, setGran] = useState<"auto" | Granularity>("auto");

  const range = useMemo(() => {
    const to = new Date();
    return { from: isoDay(subDays(to, Number(days) - 1)), to: isoDay(to) };
  }, [days]);

  const q = useQuery({
    queryKey: ["dashboard-analytics", range, gran],
    queryFn: () => dashboardApi.analytics({ ...range, granularity: gran === "auto" ? undefined : gran }),
  });
  const home = useQuery({ queryKey: ["dashboard-home"], queryFn: dashboardApi.home, refetchInterval: 60_000 });
  const attention = useQuery({ queryKey: ["attention-summary"], queryFn: notificationsApi.summary, refetchInterval: 30_000 });

  const d = q.data;
  const cur = d?.overview.current;
  const chg = d?.overview.changePercent;
  const series = useMemo(() => ({ revenue: (d?.sales ?? []).map((s) => s.revenue), orders: (d?.sales ?? []).map((s) => s.orders), avg: (d?.sales ?? []).map((s) => s.avgOrderValue) }), [d?.sales]);
  const axis = dark ? "#8fa3be" : "#5b6b82";
  const grid = dark ? "#1b2e4a" : "#e6ecf5";
  const tip = { background: dark ? "#0d1b30" : "#fff", border: `1px solid ${grid}`, borderRadius: 8, fontSize: 12 };

  const attentionItems = [
    { label: "Orders to confirm", value: attention.data?.pendingOrders, to: "/orders?status=PENDING", icon: <Clock size={15} /> },
    { label: "Mobile payments to verify", value: attention.data?.pendingBkashPayments, to: "/orders?paymentStatus=PENDING", icon: <Wallet size={15} /> },
    { label: "Open support tickets", value: attention.data?.openTickets, to: "/support?status=OPEN", icon: <PackageCheck size={15} /> },
    { label: "Return requests", value: attention.data?.pendingReturns, to: "/returns?status=REQUESTED", icon: <PackageCheck size={15} /> },
    { label: "Low / out of stock items", value: (attention.data?.lowStockItems ?? 0) + (attention.data?.outOfStockItems ?? 0), to: "/inventory?state=low", icon: <AlertTriangle size={15} /> },
    { label: "Unanswered questions", value: attention.data?.unansweredQuestions, to: "/questions?answered=false", icon: <PackageCheck size={15} /> },
  ];

  if (q.isError) return <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />;

  return (
    <div className="space-y-5 pb-8">
      <PageHeader
        title="Dashboard"
        description={d ? `${dateOnly(d.range.from)} – ${dateOnly(d.range.to)} · compared with the previous ${days} days` : <div className="flex h-10 flex-col justify-center gap-1.5 min-[480px]:h-5"><Skeleton className="h-3.5 w-64 max-w-full" /><Skeleton className="h-3.5 w-28 min-[480px]:hidden" /></div>}
        actions={
          <>
            <Select value={gran} onChange={(e) => setGran(e.target.value as typeof gran)} className="w-[120px]" aria-label="Group by">
              <option value="auto">Auto</option>
              <option value="day">By day</option>
              <option value="week">By week</option>
              <option value="month">By month</option>
            </Select>
            <Select value={days} onChange={(e) => setDays(e.target.value)} className="w-[150px]" aria-label="Date range">
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard hintSk label="Revenue" value={money(cur?.revenue)} change={chg?.revenue} hint="vs previous period" icon={<Banknote size={18} />} tone="orange" loading={q.isLoading} spark={series.revenue} />
        <StatCard hintSk label="Orders" value={num(cur?.orders)} change={chg?.orders} hint={cur ? `${cur.cancelledOrders} cancelled` : undefined} icon={<ShoppingBag size={18} />} loading={q.isLoading} spark={series.orders} />
        <StatCard hintSk label="Average order" value={money(Math.round(cur?.avgOrderValue ?? 0))} change={chg?.avgOrderValue} hint={cur ? `${num(cur.unitsSold)} units sold` : undefined} icon={<TrendingUp size={18} />} tone="sky" spark={series.avg} loading={q.isLoading} />
        <StatCard hintSk label="New customers" value={num(cur?.newCustomers)} change={chg?.newCustomers} hint={cur ? `${num(cur.customers)} bought` : undefined} icon={<UserPlus size={18} />} tone="green" loading={q.isLoading} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Sales over time</CardTitle>
              <CardDescription>Revenue per {d?.granularity ?? "day"} (cancelled and refunded orders excluded)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={288}>
                <AreaChart data={d?.sales ?? []} margin={{ left: -10, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e06d88" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#e06d88" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} vertical={false} />
                  <XAxis dataKey="period" tick={{ fill: axis, fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                  <Tooltip contentStyle={tip} formatter={(v, n) => [n === "revenue" ? money(Number(v)) : v, titleCase(String(n))]} labelFormatter={(l) => dateOnly(String(l))} />
                  <Area type="monotone" dataKey="revenue" stroke="#e06d88" strokeWidth={2.5} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {attentionItems.map((a) => (
              <Link key={a.label} to={a.to} className="flex items-center justify-between rounded px-2 py-2 text-[13px] hover:bg-muted">
                <span className="flex items-center gap-2 text-muted-foreground">
                  {a.icon}
                  {a.label}
                </span>
                {attention.isLoading ? <Skeleton className="h-5 w-8" /> : <span className={a.value ? "rounded bg-brand px-2 py-0.5 text-xs font-bold text-brand-foreground" : "text-xs text-muted-foreground"}>{a.value ?? 0}</span>}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <Link to="/reports?tab=product-performance" className="text-xs font-medium text-primary hover:underline">Full report</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.isLoading && <Skeleton className="h-40 w-full" />}
            {d?.topProducts.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No sales in this period.</p>}
            {d?.topProducts.slice(0, 6).map((p) => (
              <div key={p.productId} className="flex items-center gap-3">
                <Thumb src={p.image} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{num(p.units)} sold</p>
                </div>
                <span className="text-[13px] font-semibold">{money(p.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top categories</CardTitle>
          </CardHeader>
          <CardContent>
            {q.isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : d?.topCategories.length ? (
              <ResponsiveContainer width="100%" height={Math.max(160, d.topCategories.length * 38)}>
                <BarChart data={d.topCategories.slice(0, 6)} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fill: axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tip} formatter={(v) => money(Number(v))} cursor={{ fill: "transparent" }} />
                  <Bar dataKey="revenue" fill="#ba3d5d" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-xs text-muted-foreground">No sales in this period.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by payment & zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { title: "Payment method", rows: d?.revenueByPaymentMethod },
              { title: "Delivery zone", rows: d?.revenueByZone },
            ].map((g) => (
              <div key={g.title}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</p>
                {q.isLoading ? <Skeleton className="h-20 w-full" /> : (
                  <div className="flex items-center gap-3">
                    <ResponsiveContainer width={84} height={84}>
                      <PieChart>
                        <Pie data={g.rows ?? []} dataKey="revenue" nameKey="key" innerRadius={24} outerRadius={40} stroke="none">
                          {(g.rows ?? []).map((_, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <ul className="min-w-0 flex-1 space-y-1 text-xs">
                      {(g.rows ?? []).length === 0 && <li className="text-muted-foreground">No data</li>}
                      {(g.rows ?? []).map((r, i) => (
                        <li key={r.key} className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="size-2 shrink-0 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                            <span className="truncate">{titleCase(r.key)}</span>
                          </span>
                          <span className="font-semibold">{r.sharePercent}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Latest orders</CardTitle>
            <Link to="/orders" className="text-xs font-medium text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y divide-border text-sm">
              {home.isLoading && Array.from({ length: 5 }).map((_, i) => <li key={i} className="px-4 py-3"><Skeleton className="h-4 w-full" /></li>)}
              {home.data?.recentOrders.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted-foreground">No orders yet.</li>}
              {home.data?.recentOrders.map((o) => (
                <li key={o.id} className="row-enter flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 transition-colors hover:bg-muted/40" onClick={() => navigate(`/orders/${o.id}`)}>
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-semibold">{o.orderNumber}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{o.user?.name ?? o.guestName ?? "Guest"} · {timeAgo(o.placedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5"><StatusBadge status={o.paymentMethod} /><StatusBadge status={o.status} /></div>
                  <span className="ml-auto font-semibold sm:ml-0 sm:w-24 sm:text-right">{money(o.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
            <Link to="/inventory?state=low" className="text-xs font-medium text-primary hover:underline">Manage</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {home.isLoading && <Skeleton className="h-40 w-full" />}
            {home.data?.lowStock.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Nothing is running low.</p>}
            {home.data?.lowStock.map((r) => (
              <Link key={`${r.productId}-${r.variantId}`} to={`/products/${r.productId}/edit`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{r.productName}</span>
                  {r.variantName && <span className="block truncate text-[11px] text-muted-foreground">{r.variantName}</span>}
                </span>
                <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800 dark:bg-orange-500/15 dark:text-orange-300">{r.stock} left</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
