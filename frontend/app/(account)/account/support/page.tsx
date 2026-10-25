"use client";

import RequireLogin, { PageShell, primaryBtn } from "@/components/account/RequireLogin";
import { getTickets, type Ticket } from "@/lib/services/support.service";
import Link from "next/link";
import { useEffect, useState } from "react";

const STATUS: Record<string, string> = { OPEN: "Waiting for us", IN_PROGRESS: "In progress", WAITING_CUSTOMER: "Waiting for you", RESOLVED: "Resolved", CLOSED: "Closed" };
const COLOR: Record<string, string> = { OPEN: "text-yellow-300 bg-yellow-400/10", IN_PROGRESS: "text-blue-300 bg-blue-400/10", WAITING_CUSTOMER: "text-orange-300 bg-orange-400/10", RESOLVED: "text-emerald-300 bg-emerald-400/10", CLOSED: "text-muted-foreground bg-muted" };

function List() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    getTickets().then(setTickets).catch(() => setError(true));
  }, []);

  return (
    <PageShell eyebrow="My account" title="Support" accent="tickets" back={{ href: "/account", label: "Account" }}>
      <div className="mb-6 flex justify-end">
        <Link href="/account/support/new" className={primaryBtn}>New ticket</Link>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-300">Could not load your tickets. Please try again.</p>
      ) : tickets === null ? (
        <p className="text-sm text-muted-foreground/70">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="rounded border border-border bg-muted p-8 text-center text-sm text-muted-foreground/70">You have no tickets yet.</p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link href={`/account/support/${t.id}`} className="flex items-center justify-between gap-4 rounded border border-border bg-muted p-5 hover:border-brand-orange/20">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground/70">{t.ticketNumber}</p>
                  <p className="truncate font-bold text-foreground">{t.subject}</p>
                  <p className="text-xs text-muted-foreground/70">Last activity {new Date(t.lastMessageAt).toLocaleString("en-BD")}</p>
                </div>
                <span className={`shrink-0 rounded px-3 py-1 text-[10px] font-black uppercase tracking-wider ${COLOR[t.status] ?? ""}`}>{STATUS[t.status] ?? t.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

export default function SupportPage() {
  return (
    <RequireLogin>
      <List />
    </RequireLogin>
  );
}
