import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { ticketsApi, type TicketStatus } from "@/api/care";
import { errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Section } from "@/components/shared/Field";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox, Select, Textarea } from "@/components/ui/input";
import { useAct } from "@/hooks/useAct";
import { dateTime, titleCase } from "@/lib/format";
import { PRIORITY_VARIANT } from "./Support";
import { DetailPageSkeleton } from "@/components/shared/skeletons";

export default function SupportDetail() {
  const { id = "" } = useParams();
  const q = useQuery({ queryKey: ["ticket", id], queryFn: () => ticketsApi.get(id) });
  const [msg, setMsg] = useState("");
  const [internal, setInternal] = useState(false);
  const [after, setAfter] = useState<TicketStatus>("WAITING_CUSTOMER");
  const inv = [["ticket", id], ["tickets"], ["attention-summary"]];
  const reply = useAct(() => ticketsApi.reply(id, { message: msg.trim(), internal, ...(internal ? {} : { status: after }) }), { success: internal ? "Note saved" : "Reply sent", invalidate: inv, onSuccess: () => setMsg("") });
  const upd = useAct((b: { status?: TicketStatus; priority?: string }) => ticketsApi.update(id, b), { success: "Ticket updated", invalidate: inv });

  if (q.isLoading) return <DetailPageSkeleton />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const t = q.data;
  const closed = t.status === "CLOSED";
  return (
    <div>
      <PageHeader back={{ to: "/support", label: "Support tickets" }} title={<span className="flex flex-wrap items-center gap-2">{t.ticketNumber} <StatusBadge status={t.status} /><Badge variant={PRIORITY_VARIANT[t.priority]}>{titleCase(t.priority)}</Badge></span>} description={t.subject} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Conversation">
            <ul className="space-y-3">
              {t.messages.map((m) => (
                <li key={m.id} className={`flex ${m.isStaff ? "justify-end" : ""}`}>
                  <div className={`max-w-[85%] rounded px-3 py-2 text-[13px] ${m.isInternal ? "border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-500/10" : m.isStaff ? "bg-navy-700 text-white" : "bg-muted"}`}>
                    <p className="mb-0.5 flex items-center gap-1 text-[11px] opacity-70">{m.isInternal && <Lock className="size-3" />}{m.user?.name ?? (m.isStaff ? "Support" : "Customer")} · {dateTime(m.createdAt)}{m.isInternal && " · internal note"}</p>
                    <p className="whitespace-pre-wrap">{m.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
          {!closed && (
            <Section title={internal ? "Add an internal note" : "Reply to the customer"}>
              <div className="space-y-3">
                <Textarea rows={4} value={msg} maxLength={10000} onChange={(e) => setMsg(e.target.value)} placeholder={internal ? "Only you can see this." : "The customer receives this by email and sees it in their account."} />
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px]"><Checkbox checked={internal} onChange={(e) => setInternal(e.target.checked)} />Internal note (not sent)</label>
                  {!internal && <label className="flex items-center gap-2 text-[13px]">Then set status to <Select value={after} onChange={(e) => setAfter(e.target.value as TicketStatus)} className="w-auto">{(["IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const).map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</Select></label>}
                  <Button className="ml-auto" disabled={msg.trim().length < 2} loading={reply.isPending} onClick={() => reply.mutate()}>{internal ? "Save note" : "Send reply"}</Button>
                </div>
              </div>
            </Section>
          )}
        </div>
        <div className="space-y-4">
          <Section title="Customer">
            <p className="text-[13px] font-semibold"><Link to={`/customers/${t.submittedBy.id}`} className="hover:text-primary">{t.submittedBy.name}</Link></p>
            <p className="text-[13px] text-muted-foreground">{t.submittedBy.email}</p>
            <p className="text-[13px] text-muted-foreground">{t.submittedBy.phone ?? "—"}</p>
            {t.order && <Link to={`/orders/${t.order.id}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">Order {t.order.orderNumber} →</Link>}
          </Section>
          <Section title="Manage">
            <div className="space-y-3">
              <label className="block text-xs font-medium text-muted-foreground">Status
                <Select value={t.status} onChange={(e) => upd.mutate({ status: e.target.value as TicketStatus })} className="mt-1">{(["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"] as const).map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</Select>
              </label>
              <label className="block text-xs font-medium text-muted-foreground">Priority
                <Select value={t.priority} onChange={(e) => upd.mutate({ priority: e.target.value })} className="mt-1">{["low", "normal", "high", "urgent"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</Select>
              </label>
              <p className="text-xs text-muted-foreground">{titleCase(t.category)} · opened {dateTime(t.createdAt)}</p>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
