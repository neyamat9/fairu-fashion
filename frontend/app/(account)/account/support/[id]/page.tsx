"use client";

import RequireLogin, { PageShell, inputCls, primaryBtn } from "@/components/account/RequireLogin";
import { errorMessage } from "@/lib/api/client";
import { closeTicket, getTicket, replyTicket, type Ticket } from "@/lib/services/support.service";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

function Thread() {
  const { id } = useParams<{ id: string }>();
  const [t, setT] = useState<Ticket | null>(null);
  const [missing, setMissing] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getTicket(id).then(setT).catch(() => setMissing(true));
  }, [id]);
  useEffect(load, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (msg.trim().length < 2) return;
    setBusy(true);
    try {
      await replyTicket(id, msg.trim());
      setMsg("");
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function close() {
    try {
      await closeTicket(id);
      toast.success("Ticket closed");
      load();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (missing) return <PageShell eyebrow="Support" title="Ticket" accent="not found" back={{ href: "/account/support", label: "Support tickets" }}><p className="text-muted-foreground">We could not find this ticket.</p></PageShell>;
  if (!t) return <PageShell eyebrow="Support" title="Loading" back={{ href: "/account/support", label: "Support tickets" }}><p className="text-muted-foreground/70">Loading…</p></PageShell>;
  const closed = t.status === "CLOSED";

  return (
    <PageShell eyebrow={t.ticketNumber} title={t.subject} back={{ href: "/account/support", label: "Support tickets" }}>
      <ul className="mb-8 space-y-3">
        {(t.messages ?? []).map((m) => (
          <li key={m.id} className={`flex ${m.isStaff ? "" : "justify-end"}`}>
            <div className={`max-w-[85%] rounded px-4 py-3 text-sm ${m.isStaff ? "bg-muted text-foreground/80" : "bg-brand-orange/15 text-foreground"}`}>
              <p className="mb-1 text-[11px] text-muted-foreground/70">{m.isStaff ? "Support team" : "You"} · {new Date(m.createdAt).toLocaleString("en-BD")}</p>
              <p className="whitespace-pre-wrap">{m.message}</p>
            </div>
          </li>
        ))}
      </ul>
      {closed ? (
        <p className="text-sm text-muted-foreground/70">This ticket is closed. Open a new one if you need more help.</p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <label htmlFor="reply" className="sr-only">Your reply</label>
          <textarea id="reply" rows={4} maxLength={5000} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a reply…" className={inputCls} />
          <div className="flex gap-3">
            <button type="submit" disabled={busy || msg.trim().length < 2} className={primaryBtn}>{busy ? "Sending…" : "Send reply"}</button>
            <button type="button" onClick={close} className="rounded border border-border px-5 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground">Close ticket</button>
          </div>
        </form>
      )}
    </PageShell>
  );
}

export default function TicketPage() {
  return (
    <RequireLogin>
      <Thread />
    </RequireLogin>
  );
}
