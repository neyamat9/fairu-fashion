"use client";

import { API_BASE_URL } from "@/lib/api/client";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

/** How often an open, visible tab asks "did the shop change?" (a ~150-byte request) */
const EVERY_MS = 60_000;

/**
 * Invisible. Pages open instantly from the cache; this makes sure a page that is already open (or cached in the browser)
 * does not keep showing old prices/stock after the admin changed something. It remembers the API's content version and checks it
 * when the tab comes back, on page changes and once a minute while visible. If the version moved, it quietly refreshes the page
 * data in the background (no skeleton, no jump to the top).
 */
export default function FreshnessWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const last = useRef<string | null>(null);
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current || document.visibilityState !== "visible") return;
    busy.current = true;
    try {
      const res = await fetch(`${API_BASE_URL}/customer/content-version`, { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { data?: { version?: string }; version?: string };
      const v = body.data?.version ?? body.version;
      if (typeof v !== "string") return;
      const changed = last.current !== null && last.current !== v;
      last.current = v;
      if (changed) {
        router.refresh();
        // the shop's own cache is refreshed a moment after the version moves: ask once more so the new copy is not missed
        window.setTimeout(() => router.refresh(), 3000);
      }
    } catch {
      /* offline or API asleep: try again next time */
    } finally {
      busy.current = false;
    }
  }, [router]);

  useEffect(() => {
    void check();
  }, [check, pathname]);

  useEffect(() => {
    const id = window.setInterval(() => void check(), EVERY_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [check]);

  return null;
}
