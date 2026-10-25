"use client";

import RequireLogin, { PageShell, inputCls, primaryBtn } from "@/components/account/RequireLogin";
import { errorMessage } from "@/lib/api/client";
import { createTicket } from "@/lib/services/support.service";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

const CATEGORIES = [
  ["ORDER", "An order"], ["PAYMENT", "Payment"], ["DELIVERY", "Delivery"], ["RETURN_WARRANTY", "Return or warranty"], ["PRODUCT", "A product"], ["ACCOUNT", "My account"], ["OTHER", "Something else"],
];

function Form() {
  const router = useRouter();
  const orderId = useSearchParams().get("order") ?? undefined;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState(orderId ? "ORDER" : "OTHER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 3) return setError("Give the ticket a short subject");
    if (message.trim().length < 10) return setError("Please describe the problem in at least 10 characters");
    setBusy(true);
    setError(null);
    try {
      const t = await createTicket({ subject: subject.trim(), message: message.trim(), category, orderId });
      toast.success("Ticket opened. We'll reply here and by email.");
      router.push(`/account/support/${t.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <PageShell eyebrow="My account" title="New" accent="ticket" back={{ href: "/account/support", label: "Support tickets" }}>
      <form onSubmit={submit} noValidate className="space-y-5 rounded border border-border bg-muted p-6">
        {orderId && <p className="rounded bg-brand-orange/10 px-4 py-2 text-xs text-accent-text">This ticket will be linked to your order.</p>}
        <div>
          <label htmlFor="cat" className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">What is it about?</label>
          <select id="cat" value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sub" className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">Subject</label>
          <input id="sub" maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label htmlFor="msg" className="mb-1.5 block text-xs font-black uppercase tracking-widest text-muted-foreground">How can we help?</label>
          <textarea id="msg" rows={6} maxLength={5000} value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls} />
        </div>
        {error && <p role="alert" className="text-sm font-bold text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Sending…" : "Open ticket"}</button>
      </form>
    </PageShell>
  );
}

export default function NewTicketPage() {
  return (
    <RequireLogin>
      <Suspense fallback={null}>
        <Form />
      </Suspense>
    </RequireLogin>
  );
}
