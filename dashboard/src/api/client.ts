import axios, { AxiosError, type AxiosRequestConfig } from "axios";

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:8000/api";
// The server's public base (for /uploads/... links that come back relative)
export const ASSET_BASE = API_BASE.replace(/\/api\/?$/, "");

const KEYS = { access: "gb_admin_access", refresh: "gb_admin_refresh", user: "gb_admin_user" } as const;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "ADMIN" | "SUPER_ADMIN" | string;
  avatarUrl?: string | null;
}

/**
 * The signed-in session lives in ONE of two places:
 *  - localStorage    → "Remember me" was ticked: survives closing the browser
 *  - sessionStorage  → not ticked: gone when the browser (tab) closes
 * Reads look in the session first; writes go to wherever the session already is (so token refreshes stay put).
 */
const HANDOFF = "gb_admin_handoff";
const HANDOFF_MS = 20_000;

const home = (): Storage => (sessionStorage.getItem(KEYS.access) ? sessionStorage : localStorage);

export const tokens = {
  get access() {
    return sessionStorage.getItem(KEYS.access) ?? localStorage.getItem(KEYS.access);
  },
  get refresh() {
    return sessionStorage.getItem(KEYS.refresh) ?? localStorage.getItem(KEYS.refresh);
  },
  get user(): AdminUser | null {
    try {
      const raw = sessionStorage.getItem(KEYS.user) ?? localStorage.getItem(KEYS.user);
      return raw ? (JSON.parse(raw) as AdminUser) : null;
    } catch {
      return null;
    }
  },
  /** `remember` only matters for a new sign-in; a refresh keeps the session where it is. */
  set(access: string, refresh: string, user?: AdminUser, remember?: boolean) {
    const store = remember === undefined ? home() : remember ? localStorage : sessionStorage;
    store.setItem(KEYS.access, access);
    store.setItem(KEYS.refresh, refresh);
    if (user) store.setItem(KEYS.user, JSON.stringify(user));
  },
  clear() {
    for (const store of [localStorage, sessionStorage]) Object.values(KEYS).forEach((k) => store.removeItem(k));
    localStorage.removeItem(HANDOFF);
  },
  /** true when the login ends with the browser (Remember me not ticked) */
  get sessionOnly() {
    return !!sessionStorage.getItem(KEYS.access);
  },
};

/**
 * A page opened in a new tab starts with an empty sessionStorage. For a session-only login we leave a 20-second note
 * in localStorage right before the tab opens; the new tab picks it up, moves it into its own sessionStorage, and deletes it.
 */
export function prepareTabHandoff() {
  if (!tokens.sessionOnly) return;
  try {
    localStorage.setItem(HANDOFF, JSON.stringify({ at: Date.now(), access: tokens.access, refresh: tokens.refresh, user: tokens.user }));
  } catch {
    /* storage full or blocked: the new tab will ask to sign in */
  }
}
function takeTabHandoff() {
  try {
    const raw = localStorage.getItem(HANDOFF);
    if (!raw) return;
    localStorage.removeItem(HANDOFF);
    const h = JSON.parse(raw) as { at: number; access: string; refresh: string; user: AdminUser | null };
    if (!sessionStorage.getItem(KEYS.access) && !localStorage.getItem(KEYS.access) && Date.now() - h.at < HANDOFF_MS && h.access) {
      sessionStorage.setItem(KEYS.access, h.access);
      sessionStorage.setItem(KEYS.refresh, h.refresh);
      if (h.user) sessionStorage.setItem(KEYS.user, JSON.stringify(h.user));
    }
  } catch {
    /* ignore */
  }
}
if (typeof window !== "undefined") {
  takeTabHandoff();
  // any link that is about to open a new tab (target=_blank, ctrl/⌘/shift-click, middle click)
  const onLink = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a || a.origin !== location.origin) return;
    if (a.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) prepareTabHandoff();
  };
  document.addEventListener("click", onLink, true);
  document.addEventListener("auxclick", onLink, true);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const api = axios.create({ baseURL: API_BASE, headers: { "Content-Type": "application/json" } });

api.interceptors.request.use((config) => {
  const t = tokens.access;
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// ---- token refresh (one at a time; callers wait for it) ----
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const user = tokens.user;
  const rt = tokens.refresh;
  if (!user || !rt) return false;
  try {
    const res = await axios.post(`${API_BASE}/admin/auth/refresh`, { userId: user.id, refreshToken: rt });
    const d = (res.data?.data ?? res.data) as { accessToken: string; refreshToken: string };
    tokens.set(d.accessToken, d.refreshToken, user);
    return true;
  } catch {
    return false;
  }
}

export const SESSION_EXPIRED_EVENT = "gb:session-expired";

api.interceptors.response.use(
  (res) => {
    const body = res.data;
    // Unwrap the server envelope { success, message, data }
    if (body && typeof body === "object" && body.success === true && "data" in body) res.data = body.data;
    return res;
  },
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const isAuthCall = original?.url?.includes("/admin/auth/login") || original?.url?.includes("/admin/auth/refresh");

    if (status === 401 && original && !original._retried && !isAuthCall && tokens.refresh) {
      original._retried = true;
      refreshing ??= refreshSession().finally(() => {
        refreshing = null;
      });
      if (await refreshing) {
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${tokens.access}` } as never;
        return api(original);
      }
      tokens.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    } else if (status === 401 && !isAuthCall) {
      tokens.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

// A readable message from whatever the server (or network) answered.
export function errorMessage(e: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(e)) {
    if (!e.response) return "Cannot reach the server. Check your connection.";
    const m = (e.response.data as { message?: unknown } | undefined)?.message;
    if (Array.isArray(m)) return m.join(". ");
    if (typeof m === "string" && m) return m;
    return e.response.statusText || fallback;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function assetUrl(url?: string | null): string {
  if (!url) return "";
  if (
    /^https?:\/\//i.test(url) ||
    url.startsWith("data:") ||
    url.startsWith("/curated/") ||
    url.startsWith("/hero/") ||
    url.startsWith("/garments/") ||
    url.startsWith("/textures/") ||
    url.startsWith("/clouds/") ||
    url.startsWith("/logo")
  ) {
    return url;
  }
  return `${ASSET_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

// ---- paged lists: the API answers { data, meta } ----
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export interface Paged<T> {
  data: T[];
  meta: PageMeta;
}

// Drop empty filters so the API never receives `status=`
export function clean<T extends Record<string, unknown>>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL"),
  ) as Partial<T>;
}

// Download a file (CSV / Excel) through the authenticated client
export async function downloadFile(path: string, params: Record<string, unknown> = {}, fallbackName = "download") {
  const res = await api.get(path, { params: clean(params), responseType: "blob" });
  const blob = res.data as Blob;
  const cd = (res.headers["content-disposition"] as string | undefined) ?? "";
  const name = /filename="?([^";]+)"?/i.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// Open an HTML document that needs the auth header (invoice) in a new tab
export async function openHtml(path: string, params: Record<string, unknown> = {}) {
  const res = await api.get(path, { params, responseType: "text", transformResponse: (d) => d as string });
  const win = window.open("", "_blank");
  if (win) {
    win.document.open();
    win.document.write(res.data as string);
    win.document.close();
  }
}
