import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, FileText, MapPin, Package, Pencil, RotateCcw, Truck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox, Label } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section, KeyValue, Field } from "@/components/shared/Field";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Thumb } from "@/components/shared/Thumb";
import { ErrorState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { isMobileBanking, ORDER_STATUSES, ordersApi, PAYMENT_METHOD_LABEL, type OrderDetail as Order, type OrderStatus } from "@/api/orders";
import { errorMessage, openHtml } from "@/api/client";
import { useAct } from "@/hooks/useAct";
import { dateTime, money, orderStatusLabel, titleCase } from "@/lib/format";
import { EditAddressDialog } from "./components/EditAddressDialog";
import { EditItemsDialog } from "./components/EditItemsDialog";
import { RecordPaymentDialog, RefundDialog } from "./components/PaymentDialogs";
import { DetailPageSkeleton } from "@/components/shared/skeletons";
import { OrderProgress } from "./components/OrderProgress";

const LOCKED: OrderStatus[] = ["DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"];

function StatusDialog({ order, open, onOpenChange }: { order: Order; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [note, setNote] = useState("");
  const save = useAct(() => ordersApi.setStatus(order.id, status, note), {
    success: "Status updated",
    invalidate: [["order", order.id], ["orders"]],
    onSuccess: () => onOpenChange(false),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Change order status</DialogTitle>
          <DialogDescription>Moving to Cancelled or Returned puts the stock back. The customer is emailed.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label="New status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{orderStatusLabel(s)}</option>)}
            </Select>
          </Field>
          <Field label="Note (optional)"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={save.isPending} disabled={status === order.status} onClick={() => save.mutate()}>Update status</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShippingCard({ order }: { order: Order }) {
  const [courier, setCourier] = useState(order.courierName ?? "");
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [url, setUrl] = useState(order.trackingUrl ?? "");
  const [notify, setNotify] = useState(false);
  const save = useAct(
    () => ordersApi.shipping(order.id, { courierName: courier || null, trackingNumber: tracking || null, trackingUrl: url || null, notifyCustomer: notify }),
    { success: "Shipping details saved", invalidate: [["order", order.id]] },
  );
  return (
    <Section title="Courier & tracking" actions={<Truck className="size-4 text-muted-foreground" />}>
      <div className="space-y-3">
        <Field label="Courier"><Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Pathao, Steadfast, RedX…" /></Field>
        <Field label="Tracking number"><Input value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
        <Field label="Tracking link"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></Field>
        <div className="flex items-center gap-2">
          <Checkbox id="notify" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
          <Label htmlFor="notify" className="cursor-pointer text-[13px] font-normal text-foreground">Email the customer the tracking details</Label>
        </div>
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save</Button>
      </div>
    </Section>
  );
}

function NotesCard({ order }: { order: Order }) {
  const [internal, setInternal] = useState(order.internalNote ?? "");
  const [delivery, setDelivery] = useState(order.deliveryNote ?? "");
  const save = useAct(() => ordersApi.notes(order.id, { internalNote: internal || null, deliveryNote: delivery || null }), { success: "Notes saved", invalidate: [["order", order.id]] });
  return (
    <Section title="Notes">
      <div className="space-y-3">
        {order.customerNote && (
          <div className="rounded bg-orange-50 px-3 py-2 text-[13px] dark:bg-orange-500/10">
            <span className="text-xs font-semibold text-orange-800 dark:text-orange-300">Customer said</span>
            <p className="mt-0.5 whitespace-pre-wrap">{order.customerNote}</p>
          </div>
        )}
        <Field label="Delivery note (shown on the invoice)"><Textarea rows={2} value={delivery} onChange={(e) => setDelivery(e.target.value)} maxLength={500} /></Field>
        <Field label="Internal note (only you see this)"><Textarea rows={3} value={internal} onChange={(e) => setInternal(e.target.value)} maxLength={1000} /></Field>
        <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Save notes</Button>
      </div>
    </Section>
  );
}

export default function OrderDetailPage() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["order", id], queryFn: () => ordersApi.get(id), enabled: !!id });
  const [dlg, setDlg] = useState<null | "status" | "address" | "items" | "pay" | "refund" | "verifyPaid" | "verifyFailed">(null);

  const advance = useAct((status: OrderStatus) => ordersApi.setStatus(id, status), {
    success: "Status updated",
    invalidate: [["order", id], ["orders"]],
  });
  const verify = useAct((s: "PAID" | "FAILED") => ordersApi.verifyPayment(id, s), {
    success: "Payment updated",
    invalidate: [["order", id], ["orders"]],
    onSuccess: () => setDlg(null),
  });

  if (q.isLoading) return <DetailPageSkeleton />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const o = q.data;
  const locked = LOCKED.includes(o.status);
  const FLOW: { status: OrderStatus; label: string }[] = [
    { status: "CONFIRMED", label: "Confirmed" },
    { status: "PROCESSING", label: "Processing" },
    { status: "SHIPPED", label: "Shipped" },
    { status: "IN_TRANSIT", label: "In transit" },
    { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
    { status: "DELIVERED", label: "Delivered" },
  ];
  const at = o.status === "PENDING" || o.status === "ON_HOLD" ? -1 : FLOW.findIndex((f) => f.status === o.status);
  const next = locked ? null : FLOW[at + 1] ?? null;
  const customerName = o.user?.name ?? o.guestName ?? o.shippingAddress?.fullName ?? "Guest";
  const refunded = o.refundTransactions.filter((r) => r.status === "REFUNDED").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div>
      <PageHeader
        back={{ to: "/orders", label: "Orders" }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            Order {o.orderNumber} <StatusBadge status={o.status} /> <StatusBadge status={o.paymentStatus} />
            {o.source === "ADMIN" && <Badge variant="orange">Admin order</Badge>}
          </span>
        }
        description={`Placed ${dateTime(o.placedAt)}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => openHtml(`/admin/orders/${o.id}/invoice`).catch((e) => toast.error(errorMessage(e)))}>
              <FileText /> Invoice
            </Button>
            {next && (
              <Button size="sm" variant="brand" loading={advance.isPending} onClick={() => advance.mutate(next.status)}>
                Mark {next.label.toLowerCase()}
              </Button>
            )}
            <Button size="sm" variant={next ? "outline" : "default"} onClick={() => setDlg("status")}>Change status</Button>
          </>
        }
      />

      <OrderProgress order={o} />

      {o.warnings && o.warnings.length > 0 && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          {o.warnings.map((w) => <p key={w}>{w}</p>)}
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-4 lg:col-span-2">
          <Section
            title="Items"
            actions={!locked && <Button variant="outline" size="xs" onClick={() => setDlg("items")}><Pencil /> Edit items</Button>}
            className="[&>div:last-child]:p-0"
          >
            <ul className="divide-y divide-border">
              {o.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-3">
                  <Thumb src={i.productImage} alt={i.productName} className="size-12" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${i.productId}/edit`} target="_blank" rel="noopener noreferrer" className="line-clamp-1 text-[13px] font-medium hover:text-primary">{i.productName}</Link>
                    <p className="text-xs text-muted-foreground">{[i.variantName, i.variantSku].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  <div className="text-right text-[13px]">
                    <p className="text-muted-foreground">{money(i.price)} × {i.quantity}</p>
                    <p className="font-semibold">{money(i.total)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="border-t border-border px-4 py-3">
              <KeyValue label="Subtotal">{money(o.subtotal)}</KeyValue>
              <KeyValue label={`Discount${o.couponCode ? ` (${o.couponCode})` : ""}`}>− {money(o.discountAmount)}</KeyValue>
              <KeyValue label="Shipping">{money(o.shippingCost)}</KeyValue>
              <KeyValue label="Total" className="text-base"><span className="font-bold">{money(o.total)}</span></KeyValue>
              <KeyValue label="Paid">{money(o.paidAmount)}</KeyValue>
              {refunded > 0 && <KeyValue label="Refunded">{money(refunded)}</KeyValue>}
              <KeyValue label="Due"><span className={Number(o.dueAmount) > 0 ? "text-destructive" : ""}>{money(o.dueAmount)}</span></KeyValue>
            </dl>
          </Section>

          <Section
            title="Payments"
            actions={
              <div className="flex gap-2">
                {Number(o.dueAmount) > 0 && o.status !== "CANCELLED" && <Button variant="outline" size="xs" onClick={() => setDlg("pay")}><CreditCard /> Record payment</Button>}
                {Number(o.paidAmount) > 0 && <Button variant="outline" size="xs" onClick={() => setDlg("refund")}><RotateCcw /> Refund</Button>}
              </div>
            }
          >
            {isMobileBanking(o.paymentMethod) && o.paymentStatus === "PENDING" && (
              <div className="mb-3 rounded border border-orange-200 bg-orange-50 p-3 text-[13px] dark:border-orange-500/30 dark:bg-orange-500/10">
                <p className="font-semibold">{PAYMENT_METHOD_LABEL[o.paymentMethod]} payment waiting to be verified</p>
                <p className="mt-0.5 text-muted-foreground">
                  Sender {o.bkashSenderNumber ?? "—"} · Transaction <span className="font-mono">{o.bkashTransactionId ?? "—"}</span> · Amount {money(o.total)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Check it in your {PAYMENT_METHOD_LABEL[o.paymentMethod]} app, then confirm.</p>
                <div className="mt-2 flex gap-2">
                  <Button size="xs" onClick={() => setDlg("verifyPaid")}>Mark as paid</Button>
                  <Button size="xs" variant="destructive" onClick={() => setDlg("verifyFailed")}>Mark as failed</Button>
                </div>
              </div>
            )}
            {o.payments.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No payments recorded. Method: {titleCase(o.paymentMethod)}.</p>
            ) : (
              <ul className="divide-y divide-border">
                {o.payments.map((p) => (
                  <li key={p.id} className="py-2 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{money(p.amount)} · {titleCase(p.method)}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">{p.transactionId ? `Txn ${p.transactionId} · ` : ""}{dateTime(p.paidAt ?? p.createdAt)}</p>
                    {p.refunds.map((r) => (
                      <p key={r.id} className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">↩ Refunded {money(r.amount)} ({titleCase(r.method)}) — {r.reason}</p>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Timeline">
            <ol className="relative space-y-4 border-l border-border pl-5">
              {[...o.statusHistory].reverse().map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[25px] top-1 size-2.5 rounded-full bg-orange-500 ring-4 ring-card" />
                  <p className="text-[13px] font-medium">
                    {h.fromStatus ? `${orderStatusLabel(h.fromStatus)} → ` : ""}{orderStatusLabel(h.toStatus)}
                  </p>
                  {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                  <p className="text-[11px] text-muted-foreground">{dateTime(h.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Customer" actions={<User className="size-4 text-muted-foreground" />}>
            <p className="text-[13px] font-semibold">
              {o.user ? <Link to={`/customers/${o.user.id}`} className="hover:text-primary">{customerName}</Link> : customerName}
              {!o.user && <Badge className="ml-2">Guest</Badge>}
            </p>
            <p className="text-[13px] text-muted-foreground">{o.user?.email ?? o.guestEmail ?? "—"}</p>
            <p className="text-[13px] text-muted-foreground">{o.user?.phone ?? o.guestPhone ?? o.shippingAddress?.phone ?? "—"}</p>
          </Section>

          <Section
            title="Delivery address"
            actions={<div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{!locked && <Button variant="ghost" size="icon-xs" onClick={() => setDlg("address")}><Pencil /></Button>}</div>}
          >
            {o.shippingAddress ? (
              <address className="text-[13px] not-italic leading-relaxed">
                <p className="font-semibold">{o.shippingAddress.fullName}</p>
                <p>{o.shippingAddress.phone}</p>
                <p>{o.shippingAddress.line1}</p>
                <p>{[o.shippingAddress.upazila, o.shippingAddress.district, o.shippingAddress.division].filter(Boolean).join(", ")}</p>
                {o.shippingAddress.postalCode && <p>{o.shippingAddress.postalCode}</p>}
              </address>
            ) : <p className="text-[13px] text-muted-foreground">{o.source === "ADMIN" && !o.shippingZone ? "Walk-in sale: handed over at the counter, no delivery." : "No address."}</p>}
            {o.shippingZone && <p className="mt-2 text-xs text-muted-foreground"><Package className="mr-1 inline size-3" />Shipping zone: {titleCase(o.shippingZone)}</p>}
          </Section>

          <ShippingCard key={`${o.courierName}-${o.trackingNumber}-${o.trackingUrl}`} order={o} />
          <NotesCard key={`${o.internalNote}-${o.deliveryNote}`} order={o} />
        </div>
      </div>

      {dlg === "status" && <StatusDialog order={o} open onOpenChange={() => setDlg(null)} />}
      {dlg === "address" && <EditAddressDialog order={o} open onOpenChange={() => setDlg(null)} />}
      {dlg === "items" && <EditItemsDialog order={o} open onOpenChange={() => setDlg(null)} />}
      {dlg === "pay" && <RecordPaymentDialog order={o} open onOpenChange={() => setDlg(null)} />}
      {dlg === "refund" && <RefundDialog order={o} open onOpenChange={() => setDlg(null)} />}
      <ConfirmDialog
        open={dlg === "verifyPaid" || dlg === "verifyFailed"}
        onOpenChange={() => setDlg(null)}
        title={dlg === "verifyFailed" ? "Mark payment as failed?" : "Mark payment as paid?"}
        description={dlg === "verifyFailed" ? "The customer will be told the payment could not be verified." : `Confirm you received ${money(o.total)} in ${PAYMENT_METHOD_LABEL[o.paymentMethod]}.`}
        confirmLabel={dlg === "verifyFailed" ? "Mark failed" : "Mark paid"}
        destructive={dlg === "verifyFailed"}
        loading={verify.isPending}
        onConfirm={() => verify.mutate(dlg === "verifyFailed" ? "FAILED" : "PAID")}
      />
    </div>
  );
}
