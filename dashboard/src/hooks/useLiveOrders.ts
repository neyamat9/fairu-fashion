import { createElement, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { notificationLink, notificationsApi } from "@/api/notifications";
import { useUi } from "@/store/ui";
import { ShoppingBag } from "lucide-react";

const BASE_TITLE = "Fairu Fashion Admin";
let audio: AudioContext | null = null;

/** A short two-note chime made with the browser's own synth (no sound file needed). */
export function chime() {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const t = audio.currentTime;
    [[880, 0], [1318, 0.14]].forEach(([f, d]) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.18, t + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.45);
      o.connect(g).connect(audio!.destination);
      o.start(t + d);
      o.stop(t + d + 0.5);
    });
  } catch {
    /* no audio available: the toast is enough */
  }
}

/**
 * Watches for new orders while the admin has the dashboard open: a toast with "View", a chime (can be muted),
 * the tab title shows how many are new, and the order lists refresh by themselves.
 */
export function useLiveOrders() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const sound = useUi((s) => s.sound);
  const soundRef = useRef(sound);
  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);
  const known = useRef<Set<string> | null>(null);
  const fresh = useRef(0);

  const q = useQuery({ queryKey: ["live-orders"], queryFn: () => notificationsApi.list({ limit: 10, type: "NEW_ORDER" }), refetchInterval: 15_000, staleTime: 0, refetchIntervalInBackground: true });

  useEffect(() => {
    const rows = q.data?.data;
    if (!rows) return;
    if (!known.current) {
      known.current = new Set(rows.map((r) => r.id)); // what was already there when the page opened is not "new"
      return;
    }
    const added = rows.filter((r) => !known.current!.has(r.id));
    if (!added.length) return;
    added.forEach((r) => known.current!.add(r.id));
    for (const n of added.slice(0, 3)) {
      toast(n.title, {
        description: n.body,
        icon: createElement(ShoppingBag, { className: "size-4 text-orange-500" }),
        duration: 12_000,
        action: { label: "View order", onClick: () => nav(notificationLink(n)) },
      });
    }
    if (soundRef.current) chime();
    fresh.current += added.length;
    if (document.hidden) document.title = `(${fresh.current}) New order · ${BASE_TITLE}`;
    for (const k of ["orders", "dashboard-home", "attention-summary", "notif-feed", "notif-unread", "notifications"]) void qc.invalidateQueries({ queryKey: [k] });
  }, [q.data, nav, qc]);

  // the title goes back to normal when the admin returns to the tab
  useEffect(() => {
    const back = () => {
      if (!document.hidden) {
        fresh.current = 0;
        document.title = BASE_TITLE;
      }
    };
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => {
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
    };
  }, []);
}
