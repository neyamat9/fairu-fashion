import { useState } from "react";
import { Link } from "react-router";
import { Trash2 } from "lucide-react";
import { reviewsApi, type Question } from "@/api/care";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar, FilterSelect, SearchInput } from "@/components/shared/FilterBar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAct } from "@/hooks/useAct";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime } from "@/lib/format";

function AnswerDialog({ q, onClose }: { q: Question; onClose: () => void }) {
  const [a, setA] = useState(q.answer ?? "");
  const save = useAct(() => reviewsApi.answer(q.id, a.trim()), { success: "Answer published", invalidate: [["questions"], ["attention-summary"]], onSuccess: onClose });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="md">
        <DialogHeader><DialogTitle>{q.answer ? "Edit answer" : "Answer question"}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-3">
          <div className="rounded bg-muted p-3 text-[13px]"><p className="text-xs text-muted-foreground">{q.user.name} asked about {q.product.name}</p><p className="mt-1 font-medium">{q.question}</p></div>
          <Textarea rows={5} value={a} maxLength={2000} onChange={(e) => setA(e.target.value)} placeholder="Your answer (shown publicly on the product page)" autoFocus />
        </DialogBody>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!a.trim()} loading={save.isPending} onClick={() => save.mutate()}>Publish answer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Questions() {
  const [f, setF] = useUrlState({ search: "", answered: "", page: "1" });
  const search = f.search; // SearchInput waits for a pause in typing before it changes the URL
  const [ans, setAns] = useState<Question | null>(null);
  const [del, setDel] = useState<Question | null>(null);
  const q = useInfiniteList(["questions", search, f.answered], (page) => reviewsApi.questions({ search, answered: f.answered, page, limit: 20 }));
  const remove = useAct(() => reviewsApi.removeQuestion(del!.id), { success: "Question deleted", invalidate: [["questions"], ["attention-summary"]], onSuccess: () => setDel(null) });
  const cols: Column<Question>[] = [
    { key: "q", header: "Question", sk: "lines2", cell: (x) => <div className="max-w-[440px]"><p className="font-medium">{x.question}</p>{x.answer && <p className="mt-1 line-clamp-2 border-l-2 border-orange-300 pl-2 text-[13px] text-muted-foreground">{x.answer}</p>}</div> },
    { key: "p", header: "Product", sk: "text", cell: (x) => <Link to={`/products/${x.product.id}/edit`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="line-clamp-2 max-w-[200px] hover:text-primary">{x.product.name}</Link> },
    { key: "u", header: "Asked by", sk: "lines2", cell: (x) => <div><p>{x.user.name}</p><p className="text-[11px] text-muted-foreground">{dateTime(x.createdAt)}</p></div> },
    { key: "s", header: "Status", sk: "badge", cell: (x) => (x.answer ? <Badge variant="success">Answered</Badge> : <Badge variant="warning">Waiting</Badge>) },
    { key: "a", header: "", align: "right", sk: "icon", cell: (x) => <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}><Button size="xs" variant={x.answer ? "outline" : "brand"} onClick={() => setAns(x)}>{x.answer ? "Edit" : "Answer"}</Button><Button size="icon-sm" variant="ghost" aria-label="Delete" onClick={() => setDel(x)}><Trash2 className="text-destructive" /></Button></div> },
  ];
  return (
    <div>
      <PageHeader title="Questions" description="Questions customers ask on product pages." />
      <DataTable infinite={q} columns={cols} onRowClick={(x) => setAns(x)} empty={{ title: "No questions" }}
        toolbar={<FilterBar><SearchInput value={f.search} onChange={(v) => setF({ search: v })} placeholder="Question, product…" /><FilterSelect value={f.answered} onChange={(v) => setF({ answered: v })} all="All" options={[{ value: "false", label: "Waiting for an answer" }, { value: "true", label: "Answered" }]} /></FilterBar>} />
      {ans && <AnswerDialog q={ans} onClose={() => setAns(null)} />}
      <ConfirmDialog open={!!del} onOpenChange={(o) => !o && setDel(null)} title="Delete this question?" confirmLabel="Delete" destructive loading={remove.isPending} onConfirm={() => remove.mutate()} />
    </div>
  );
}
