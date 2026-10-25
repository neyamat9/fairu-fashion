import { useState } from "react";
import { Mail, Trash2 } from "lucide-react";
import { contactApi, type ContactMessage, type ContactStatus } from "@/api/care";
import { QuickStatus, type QuickOption } from "@/components/shared/QuickStatus";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Field } from "@/components/shared/Field";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime } from "@/lib/format";

function Detail({ m, onClose }: { m: ContactMessage; onClose: () => void }) {
  const [reply, setReply] = useState("");
  const [note, setNote] = useState(m.adminNote ?? "");
  const [status, setStatus] = useState<ContactStatus>(m.status);
  const inv = [["contact"], ["attention-summary"]];
  const send = useAct(() => contactApi.reply(m.id, reply.trim()), { success: "Reply emailed", invalidate: inv, onSuccess: onClose });
  const save = useAct(() => contactApi.update(m.id, { status, adminNote: note.trim() || null }), { success: "Saved", invalidate: inv, onSuccess: onClose });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>{m.subject}</DialogTitle><DialogDescription>{m.name} · {m.email}{m.phone ? ` · ${m.phone}` : ""} · {dateTime(m.createdAt)}</DialogDescription></DialogHeader>
        <DialogBody className="space-y-3">
          <p className="whitespace-pre-wrap rounded bg-muted p-3 text-[13px]">{m.message}</p>
          {m.reply && <div className="rounded border-l-2 border-orange-400 bg-orange-50 p-3 text-[13px] dark:bg-orange-500/10"><p className="mb-1 text-xs text-muted-foreground">You replied {m.repliedAt && dateTime(m.repliedAt)}</p><p className="whitespace-pre-wrap">{m.reply}</p></div>}
          <Field label={m.reply ? "Send another reply" : "Reply by email"}><Textarea rows={4} value={reply} maxLength={10000} onChange={(e) => setReply(e.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Status"><Select value={status} onChange={(e) => setStatus(e.target.value as ContactStatus)}>{(["NEW", "READ", "REPLIED", "ARCHIVED"] as const).map((s) => <option key={s} value={s}>{s[0] + s.slice(1).toLowerCase()}</option>)}</Select></Field>
            <Field label="Private note" className="sm:col-span-2"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          </div>
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button><Button variant="outline" loading={save.isPending} onClick={() => save.mutate()}>Save status & note</Button><Button disabled={reply.trim().length < 2} loading={send.isPending} onClick={() => send.mutate()}><Mail /> Send reply</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const CONTACT_STATUSES: QuickOption<ContactStatus>[] = [
  { value: "NEW", label: "Mark as new" },
  { value: "READ", label: "Mark as read" },
  { value: "REPLIED", label: "Mark as replied" },
  { value: "ARCHIVED", label: "Archive" },
];

export default function Contact() {
  const [f, setF] = useUrlState({ search: "", status: "", page: "1" });
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [open, setOpen] = useState<ContactMessage | null>(null);
  const [del, setDel] = useState<ContactMessage | null>(null);
  const q = useInfiniteList(["contact", search, f.status], (page) => contactApi.list({ search, status: f.status, page, limit: 20 }));
  const mark = useAct((m: ContactMessage) => contactApi.update(m.id, { status: "READ" }), { invalidate: [["contact"], ["attention-summary"]] });
  const move = useAct((v: { id: string; status: ContactStatus }) => contactApi.update(v.id, { status: v.status }), { success: "Message updated", invalidate: [["contact"], ["attention-summary"]] });
  const remove = useAct(() => contactApi.remove(del!.id), { success: "Message deleted", invalidate: [["contact"], ["attention-summary"]], onSuccess: () => setDel(null) });
  const cols: Column<ContactMessage>[] = [
    { key: "f", header: "From", sk: "lines2", cell: (m) => <div><p className={m.status === "NEW" ? "font-bold" : "font-medium"}>{m.name}</p><p className="text-[11px] text-muted-foreground">{m.email}</p></div> },
    { key: "s", header: "Message", sk: "lines2", cell: (m) => <div className="max-w-[420px]"><p className={`truncate ${m.status === "NEW" ? "font-semibold" : ""}`}>{m.subject}</p><p className="truncate text-[12px] text-muted-foreground">{m.message}</p></div> },
    { key: "st", header: "Status", sk: "badge", cell: (m) => <QuickStatus current={m.status} options={CONTACT_STATUSES} pending={move.isPending && move.variables?.id === m.id} onPick={(status) => move.mutate({ id: m.id, status })} /> },
    { key: "d", header: "Received", sk: "text", cell: (m) => dateTime(m.createdAt) },
    { key: "a", header: "", align: "right", sk: "icon", cell: (m) => <div onClick={(e) => e.stopPropagation()}><Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel(m)}><Trash2 className="text-destructive" /></Button></div> },
  ];
  return (
    <div>
      <PageHeader title="Contact messages" description={q.first ? `${q.first.unread} unread` : "Messages from the website contact form."} />
      <DataTable infinite={q} columns={cols} onRowClick={(m) => { setOpen(m); if (m.status === "NEW") mark.mutate(m); }} empty={{ title: "No messages" }}
        toolbar={<FilterBar><SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Name, email, subject…" /><FilterSelect value={f.status} onChange={(v) => setF({ status: v })} all="All" options={["NEW", "READ", "REPLIED", "ARCHIVED"].map((s) => ({ value: s, label: s[0] + s.slice(1).toLowerCase() }))} /></FilterBar>} />
      {open && <Detail m={open} onClose={() => setOpen(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this message?" confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
