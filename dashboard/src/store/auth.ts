import { create } from "zustand";
import { api, tokens, type AdminUser, SESSION_EXPIRED_EVENT } from "@/api/client";

interface AuthState {
  user: AdminUser | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: AdminUser) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: tokens.access ? tokens.user : null,
  async login(email, password, remember = false) {
    const res = await api.post<{ accessToken: string; refreshToken: string; user: AdminUser }>("/admin/auth/login", { email, password });
    tokens.clear();
    tokens.set(res.data.accessToken, res.data.refreshToken, res.data.user, remember);
    set({ user: res.data.user });
  },
  async logout() {
    try {
      if (tokens.access) await api.post("/admin/auth/logout");
    } catch {
      /* already signed out */
    }
    tokens.clear();
    set({ user: null });
  },
  setUser(u) {
    tokens.set(tokens.access ?? "", tokens.refresh ?? "", u);
    set({ user: u });
  },
}));

window.addEventListener(SESSION_EXPIRED_EVENT, () => useAuth.setState({ user: null }));
