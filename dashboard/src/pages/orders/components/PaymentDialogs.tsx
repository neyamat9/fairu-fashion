import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/shared/Field";
import { ordersApi, type OrderDetail, type PaymentMethod } from "@/api/orders";
import { useAct } from "@/hooks/useAct";
import { money } from "@/lib/format";

export function RecordPaymentDialog({ order, open, onOpenChange }: { order: OrderDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const due = Math.max(0, Number(order.total) - Number(order.paidAmount));
  const [amount, setAmount] = useState(String(due));
  const [method, setMethod] = useState<PaymentMethod>(order.paymentMethod);
  const [txn, setTxn] = useState("");
  const [note, setNote] = useState("");
  const save = useAct(() => ordersApi.recordPayment(order.id, { amount: Number(amount), method, transactionId: txn || undefined, note: note || undefined }), {
    success: "Payment recorded",
    invalidate: [["order", order.id], ["orders"]],
    onSuccess: () => onOpenChange(false),
  });
  const bad = !(Number(amount) > 0) || Number(amount) > due;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>Money received outside the website: cash at the shop, bKash / Nagad / Rocket to the merchant number, a deposit…</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label={`Amount ৳ (due ${money(due)})`} error={Number(amount) > due ? "More than what is due" : undefined}>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Method">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              <option value="CASH_ON_DELIVERY">Cash</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="ROCKET">Rocket</option>
            </Select>
          </Field>
          <Field label="Transaction ID (optional)"><Input value={txn} onChange={(e) => setTxn(e.target.value)} /></Field>
          <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} /></Field>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button loading={save.isPending} disabled={bad} onClick={() => save.mutate()}>Record payment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RefundDialog({ order, open, onOpenChange }: { order: OrderDetail; open: boolean; onOpenChange: (o: boolean) => void }) {
  const refundable = order.payments
    .filter((p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED")
    .map((p) => ({ p, room: Number(p.amount) - p.refunds.filter((r) => r.status === "REFUNDED").reduce((s, r) => s + Number(r.amount), 0) }))
    .filter((x) => x.room > 0);
  const [paymentId, setPaymentId] = useState(refundable[0]?.p.id ?? "");
  const room = refundable.find((x) => x.p.id === paymentId)?.room ?? 0;
  const [amount, setAmount] = useState(String(room));
  const [method, setMethod] = useState<"ORIGINAL_PAYMENT" | "STORE_CREDIT" | "BANK_TRANSFER">("ORIGINAL_PAYMENT");
  const [reason, setReason] = useState("");
  const save = useAct(() => ordersApi.refund(order.id, { paymentId: paymentId || undefined, amount: Number(amount), method, reason }), {
    success: "Refund recorded",
    invalidate: [["order", order.id], ["orders"]],
    onSuccess: () => onOpenChange(false),
  });
  const bad = !(Number(amount) > 0) || Number(amount) > room || !reason.trim();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Record a refund</DialogTitle>
          <DialogDescription>This records money you gave back. Send the money itself (bKash, bank) separately.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {refundable.length === 0 ? (
            <p className="text-sm text-muted-foreground">There is no received payment left to refund on this order.</p>
          ) : (
            <>
              {refundable.length > 1 && (
                <Field label="Payment">
                  <Select value={paymentId} onChange={(e) => { setPaymentId(e.target.value); setAmount(String(refundable.find((x) => x.p.id === e.target.value)?.room ?? 0)); }}>
                    {refundable.map(({ p, room: r }) => <option key={p.id} value={p.id}>{money(p.amount)} · {p.method} · {money(r)} refundable</option>)}
                  </Select>
                </Field>
              )}
              <Field label={`Amount ৳ (up to ${money(room)})`} error={Number(amount) > room ? "More than can be refunded" : undefined}>
                <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Paid back by">
                <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                  <option value="ORIGINAL_PAYMENT">Original payment method</option>
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="STORE_CREDIT">Store credit</option>
                </Select>
              </Field>
              <Field label="Reason" required><Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" loading={save.isPending} disabled={bad || refundable.length === 0} onClick={() => save.mutate()}>Record refund</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
