import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Package, CreditCard, LifeBuoy, RotateCcw, AlertTriangle, Mail, MessageCircleQuestion } from "lucide-react";
import { notificationsApi, notificationLink, type AdminNotification } from "@/api/notifications";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<AdminNotification["type"], React.ReactNode> = {
  NEW_ORDER: <Package size={15} />,
  PAYMENT_PENDING: <CreditCard size={15} />,
  NEW_TICKET: <LifeBuoy size={15} />,
  TICKET_REPLY: <LifeBuoy size={15} />,
  RETURN_REQUESTED: <RotateCcw size={15} />,
  LOW_STOCK: <AlertTriangle size={15} />,
  OUT_OF_STOCK: <AlertTriangle size={15} />,
  CONTACT_MESSAGE: <Mail size={15} />,
  QUESTION_ASKED: <MessageCircleQuestion size={15} />,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: unread = 0 } = useQuery({ queryKey: ["notif-unread"], queryFn: notificationsApi.unreadCount, refetchInterval: 20_000 });
  const { data: feed } = useQuery({
    queryKey: ["notif-feed"],
    queryFn: () => notificationsApi.list({ limit: 8 }),
    refetchInterval: 20_000,
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["notif-unread"] });
    void qc.invalidateQueries({ queryKey: ["notif-feed"] });
    void qc.invalidateQueries({ queryKey: ["attention-summary"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };
  const readAll = useMutation({ mutationFn: notificationsApi.readAll, onSuccess: refresh });
  const read = useMutation({ mutationFn: notificationsApi.read, onSuccess: refresh });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative flex size-9 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer outline-none" aria-label="Notifications">
          <Bell size={18} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded bg-brand px-1 text-[10px] font-bold leading-4 text-brand-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-semibold">Notifications {unread > 0 && <span className="text-muted-foreground">({unread} new)</span>}</p>
          <Button size="xs" variant="ghost" disabled={unread === 0} onClick={() => readAll.mutate()}>
            <CheckCheck /> Mark all read
          </Button>
        </div>
        <div className="custom-scrollbar max-h-[380px] overflow-y-auto">
          {(feed?.data ?? []).length === 0 && <p className="px-4 py-10 text-center text-xs text-muted-foreground">You're all caught up.</p>}
          {(feed?.data ?? []).map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.isRead) read.mutate(n.id);
                navigate(notificationLink(n));
              }}
              className={cn("flex w-full cursor-pointer gap-3 border-b border-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-muted/60", !n.isRead && "bg-accent/50")}
            >
              <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", n.isRead ? "bg-muted text-muted-foreground" : "bg-brand/20 text-orange-700 dark:text-orange-300")}>{ICONS[n.type]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{n.title}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground/80">{timeAgo(n.createdAt)}</span>
              </span>
              {!n.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" />}
            </button>
          ))}
        </div>
        <button onClick={() => navigate("/notifications")} className="w-full cursor-pointer border-t border-border py-2 text-center text-xs font-semibold text-primary hover:bg-muted/60">
          View all notifications
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
