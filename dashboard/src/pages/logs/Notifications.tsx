import { useNavigate } from "react-router";
import {
  Bell,
  CheckCheck,
  Trash2,
  ExternalLink,
  Package,
  CreditCard,
  LifeBuoy,
  RotateCcw,
  AlertTriangle,
  Mail,
  MessageCircleQuestion,
  CheckCircle2,
} from "lucide-react";
import {
  notificationsApi,
  notificationLink,
  type AdminNotificationType,
} from "@/api/notifications";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { InfiniteFooter } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAct } from "@/hooks/useAct";
import { useConfirm } from "@/hooks/useConfirm";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useUrlState } from "@/hooks/useUrlState";
import { dateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<AdminNotificationType, React.ReactNode> = {
  NEW_ORDER: <Package size={18} />,
  PAYMENT_PENDING: <CreditCard size={18} />,
  NEW_TICKET: <LifeBuoy size={18} />,
  TICKET_REPLY: <LifeBuoy size={18} />,
  RETURN_REQUESTED: <RotateCcw size={18} />,
  LOW_STOCK: <AlertTriangle size={18} />,
  OUT_OF_STOCK: <AlertTriangle size={18} />,
  CONTACT_MESSAGE: <Mail size={18} />,
  QUESTION_ASKED: <MessageCircleQuestion size={18} />,
};

const TYPE_LABELS: Record<AdminNotificationType, string> = {
  NEW_ORDER: "New Order",
  PAYMENT_PENDING: "Payment Pending",
  NEW_TICKET: "New Ticket",
  TICKET_REPLY: "Ticket Reply",
  RETURN_REQUESTED: "Return Requested",
  LOW_STOCK: "Low Stock",
  OUT_OF_STOCK: "Out of Stock",
  CONTACT_MESSAGE: "Contact Message",
  QUESTION_ASKED: "Question Asked",
};

export default function Notifications() {
  const navigate = useNavigate();
  const [f, setF] = useUrlState({ unreadOnly: "false", type: "" });

  const isUnreadOnly = f.unreadOnly === "true";
  const limit = 20;

  const invKeys = [
    ["notifications"],
    ["notif-feed"],
    ["notif-unread"],
    ["attention-summary"],
  ];

  const q = useInfiniteList(
    ["notifications", isUnreadOnly, f.type],
    (page) =>
      notificationsApi.list({
        page,
        limit,
        unread: isUnreadOnly ? true : undefined,
        type: f.type || undefined,
      }),
    { refetchInterval: 15_000 },
  );

  const markAll = useAct(() => notificationsApi.readAll(), {
    success: "All notifications marked as read",
    invalidate: invKeys,
  });

  const markRead = useAct((id: string) => notificationsApi.read(id), {
    invalidate: invKeys,
  });

  const confirm = useConfirm();
  const removeNotif = useAct((id: string) => notificationsApi.remove(id), {
    success: "Notification deleted",
    invalidate: invKeys,
  });

  const items = q.rows;
  const unreadCount = q.first?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Real-time alerts for orders, stock thresholds, payments and customer care."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={unreadCount === 0 || markAll.isPending}
              loading={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck size={16} /> Mark all read
            </Button>
          </div>
        }
      />

      {/* Filter Tabs & Select */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setF({ unreadOnly: "false" })}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              !isUnreadOnly
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            All
          </button>
          <button
            onClick={() => setF({ unreadOnly: "true" })}
            className={cn(
              "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
              isUnreadOnly
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 && (
              <span className="rounded bg-brand px-1.5 py-0.2 text-[10px] font-bold text-brand-foreground">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={f.type}
            onChange={(e) => setF({ type: e.target.value })}
            className="h-8 rounded border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Types</option>
            {(Object.keys(TYPE_LABELS) as AdminNotificationType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Notification List */}
      {q.isLoading ? (
        <div className="divide-y divide-border rounded border border-border bg-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4">
              <Skeleton className="size-9" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="No notifications"
          description={
            isUnreadOnly
              ? "You have no unread notifications."
              : "No notifications match the selected filter."
          }
        />
      ) : (
        <div className="divide-y divide-border rounded border border-border bg-card shadow-xs">
          {items.map((n) => {
            const link = notificationLink(n);
            return (
              <div
                key={n.id}
                className={cn(
                  "group flex items-start gap-4 p-4 transition-colors hover:bg-muted/50",
                  !n.isRead && "bg-brand/5 dark:bg-brand/10"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded border",
                    !n.isRead
                      ? "border-brand/40 bg-brand/15 text-orange-600 dark:text-orange-400"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {ICONS[n.type] ?? <Bell size={18} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        !n.isRead ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {n.title}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {TYPE_LABELS[n.type] || n.type}
                    </span>
                    {!n.isRead && (
                      <span className="size-2 rounded-full bg-orange-500" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {n.body}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground/75">
                    {timeAgo(n.createdAt)} · {dateTime(n.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1 opacity-90 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  {!n.isRead && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      title="Mark as read"
                      onClick={() => markRead.mutate(n.id)}
                    >
                      <CheckCircle2 size={15} />
                    </Button>
                  )}
                  {link && (
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      title="View item"
                      onClick={() => {
                        if (!n.isRead) markRead.mutate(n.id);
                        navigate(link);
                      }}
                    >
                      <ExternalLink size={15} />
                    </Button>
                  )}
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    title="Delete"
                    onClick={async () => {
                      if (await confirm({ title: "Delete this notification?", confirmLabel: "Delete", destructive: true })) removeNotif.mutate(n.id);
                    }}
                  >
                    <Trash2 size={15} className="text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="overflow-hidden rounded border border-border bg-card">
          <InfiniteFooter list={q} />
        </div>
      )}
    </div>
  );
}
