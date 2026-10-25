import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, Trash2 } from "lucide-react";
import { customersApi, type CustomerRow } from "@/api/users";
import { assetUrl, errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/Field";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAct } from "@/hooks/useAct";
import { dateOnly, dateTime, initials, money, titleCase } from "@/lib/format";
import { DetailPageSkeleton } from "@/components/shared/skeletons";

function List<T>({ q, empty, render }: { q: { isLoading: boolean; isError: boolean; error: unknown; data?: T[] }; empty: string; render: (x: T) => React.ReactNode }) {
  if (q.isLoading) return <p className="py-6 text-center text-[13px] text-muted-foreground">Loading…</p>;
  if (q.isError) return <p className="py-6 text-center text-[13px] text-destructive">{errorMessage(q.error)}</p>;
  if (!q.data?.length) return <p className="py-6 text-center text-[13px] text-muted-foreground">{empty}</p>;
  return <ul className="divide-y divide-border">{q.data.map((x, i) => <li key={i} className="py-2.5 text-[13px]">{render(x)}</li>)}</ul>;
}

function Notes({ id }: { id: string }) {
  const q = useQuery({ queryKey: ["customer", id, "notes"], queryFn: () => customersApi.notes(id) });
  const [text, setText] = useState("");
  const [del, setDel] = useState<string | null>(null);
  const add = useAct(() => customersApi.addNote(id, text.trim()), { success: "Note added", invalidate: [["customer", id, "notes"], ["customer", id]], onSuccess: () => setText("") });
  const rm = useAct((nid: string) => customersApi.removeNote(id, nid), { invalidate: [["customer", id, "notes"], ["customer", id]], onSuccess: () => setDel(null) });
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Textarea rows={2} value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="A private note about this customer (only you can see it)…" />
        <Button size="sm" disabled={!text.trim()} loading={add.isPending} onClick={() => add.mutate()}>Add note</Button>
      </div>
      <List q={q} empty="No notes yet." render={(n) => (
        <div className="flex items-start justify-between gap-3">
          <div><p className="whitespace-pre-wrap">{n.note}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{n.admin?.name ?? "Admin"} · {dateTime(n.createdAt)}</p></div>
          <Button size="icon-xs" variant="ghost" aria-label="Delete note" onClick={() => setDel(n.id)}><Trash2 className="text-destructive" /></Button>
        </div>
      )} />
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this note?" confirmLabel="Delete" destructive loading={rm.isPending} onConfirm={() => del && rm.mutate(del)} />
    </div>
  );
}

export default function CustomerDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["customer", id], queryFn: () => customersApi.get(id) });
  const [page, setPage] = useState(1);
  const orders = useQuery({ queryKey: ["customer", id, "orders", page], queryFn: () => customersApi.orders(id, page) });
  const addresses = useQuery({ queryKey: ["customer", id, "addresses"], queryFn: () => customersApi.addresses(id) });
  const tickets = useQuery({ queryKey: ["customer", id, "tickets"], queryFn: () => customersApi.tickets(id) });
  const reviews = useQuery({ queryKey: ["customer", id, "reviews"], queryFn: () => customersApi.reviews(id) });
  const coupons = useQuery({ queryKey: ["customer", id, "coupons"], queryFn: () => customersApi.coupons(id) });
  const [pending, setPending] = useState<CustomerRow["status"] | null>(null);
  const status = useAct((s: CustomerRow["status"]) => customersApi.setStatus(id, s), { success: "Account status updated", invalidate: [["customer", id], ["customers"]], onSuccess: () => setPending(null) });

  if (q.isLoading) return <DetailPageSkeleton />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const c = q.data;
  const s = c.stats;

  return (
    <div>
      <PageHeader
        back={{ to: "/customers", label: "Customers" }}
        title={<span className="flex items-center gap-3"><Avatar className="size-10">{c.avatarUrl && <AvatarImage src={assetUrl(c.avatarUrl)} />}<AvatarFallback>{initials(c.name)}</AvatarFallback></Avatar>{c.name} <StatusBadge status={c.status} /></span>}
        description={`Joined ${dateOnly(c.createdAt)} · ${c.loginCount} logins${c.lastLoginAt ? ` · last seen ${dateTime(c.lastLoginAt)}` : ""}`}
        actions={
          <Select value={c.status} onChange={(e) => setPending(e.target.value as CustomerRow["status"])} className="w-auto" aria-label="Account status">
            <option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="BANNED">Banned</option>
          </Select>
        }
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Lifetime value" value={money(s.lifetimeValue)} tone="green" hint={`${s.orders} orders`} />
        <StatCard label="Average order" value={money(s.averageOrderValue)} />
        <StatCard label="Last order" value={s.lastOrderAt ? dateOnly(s.lastOrderAt) : "—"} hint={s.firstOrderAt ? `First: ${dateOnly(s.firstOrderAt)}` : undefined} tone="orange" />
        <StatCard label="Support" value={`${s.openTickets} open`} hint={`${s.tickets} tickets · ${s.returns} returns · ${s.reviews} reviews`} tone="sky" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="lg:col-span-2">
          <Tabs defaultValue="orders">
            <TabsList className="mb-3">
              <TabsTrigger value="orders">Orders ({s.orders})</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="tickets">Tickets ({s.tickets})</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({s.reviews})</TabsTrigger>
              <TabsTrigger value="coupons">Coupons ({s.couponUses})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({s.notes})</TabsTrigger>
            </TabsList>
            <TabsContent value="orders"><Section title="Orders">
              <List q={{ ...orders, data: orders.data?.data }} empty="No orders yet." render={(o) => (
                <Link to={`/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 hover:text-primary">
                  <div className="min-w-0"><p className="font-semibold">{o.orderNumber}</p><p className="text-[11px] text-muted-foreground">{dateTime(o.placedAt)}</p></div>
                  <div className="flex flex-wrap items-center gap-2 max-sm:w-full"><StatusBadge status={o.status} /><StatusBadge status={o.paymentStatus} /><b className="ml-auto w-20 text-right">{money(o.total)}</b></div>
                </Link>
              )} />
              {orders.data && orders.data.meta.totalPages > 1 && (
                <div className="mt-3 flex justify-end gap-2"><Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button size="xs" variant="outline" disabled={page >= orders.data.meta.totalPages} onClick={() => setPage(page + 1)}>Next</Button></div>
              )}
            </Section></TabsContent>
            <TabsContent value="addresses"><Section title="Saved addresses"><List q={addresses} empty="No saved addresses." render={(a) => (
              <div><p className="font-medium">{a.fullName} · {a.phone} {a.isDefault && <Badge variant="brand">Default</Badge>}</p><p className="text-muted-foreground">{[a.line1, a.upazila, a.district, a.division].filter(Boolean).join(", ")}</p></div>
            )} /></Section></TabsContent>
            <TabsContent value="tickets"><Section title="Support tickets"><List q={{ ...tickets, data: tickets.data?.data }} empty="No tickets." render={(t) => (
              <Link to={`/support/${t.id}`} className="flex items-center justify-between gap-3 hover:text-primary"><div><p className="font-medium">{t.ticketNumber} · {t.subject}</p><p className="text-[11px] text-muted-foreground">{titleCase(t.category)} · {dateTime(t.createdAt)}</p></div><StatusBadge status={t.status} /></Link>
            )} /></Section></TabsContent>
            <TabsContent value="reviews"><Section title="Reviews"><List q={{ ...reviews, data: reviews.data?.data }} empty="No reviews." render={(r) => (
              <div><p className="font-medium">{"★".repeat(r.rating)}<span className="text-muted-foreground">{"★".repeat(5 - r.rating)}</span> · {r.product.name} <StatusBadge status={r.status} /></p><p className="text-muted-foreground">{r.title ? `${r.title} — ` : ""}{r.comment}</p></div>
            )} /></Section></TabsContent>
            <TabsContent value="coupons"><Section title="Coupons used"><List q={{ ...coupons, data: coupons.data?.data }} empty="No coupons used." render={(u) => (
              <div className="flex justify-between"><span><b>{u.coupon.code}</b> · {dateTime(u.usedAt)}</span><span>− {money(u.discountAmount)}</span></div>
            )} /></Section></TabsContent>
            <TabsContent value="notes"><Section title="Private notes"><Notes id={id} /></Section></TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4">
          <Section title="Contact">
            <p className="flex items-center gap-2 text-[13px]"><Mail className="size-4 text-muted-foreground" />{c.email} {c.emailVerified && <Badge variant="success">Verified</Badge>}</p>
            <p className="mt-2 flex items-center gap-2 text-[13px]"><Phone className="size-4 text-muted-foreground" />{c.phone ?? "—"} {c.phoneVerified && <Badge variant="success">Verified</Badge>}</p>
            <p className="mt-2 text-xs text-muted-foreground">{c.newsletter ? "Subscribed to the newsletter" : "Not on the newsletter"}</p>
          </Section>
          <Section title="Orders by status">
            <ul className="space-y-1">{Object.entries(s.ordersByStatus).map(([k, v]) => <li key={k} className="flex items-center justify-between text-[13px]"><StatusBadge status={k} /><b>{v}</b></li>)}{!Object.keys(s.ordersByStatus).length && <li className="text-[13px] text-muted-foreground">None</li>}</ul>
          </Section>
        </div>
      </div>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={`Set account to ${pending?.toLowerCase()}?`}
        description={pending === "ACTIVE" ? "They can sign in and order again." : "They will be signed out and cannot sign in or order."}
        confirmLabel="Confirm"
        destructive={pending !== "ACTIVE"}
        loading={status.isPending}
        onConfirm={() => pending && status.mutate(pending)}
      />
    </div>
  );
}
