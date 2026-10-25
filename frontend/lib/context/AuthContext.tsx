"use client";

import { AUTH_CHANGED_EVENT, AUTH_STORAGE_KEYS, errorMessage, tokens } from "@/lib/api/client";
import { markLeaving } from "@/lib/auth-intent";
import * as auth from "@/lib/services/auth.service";
import type { AuthContextValue, SignupData, User } from "@/lib/types";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load the profile for a saved login. Only a real "not logged in" answer drops the login;
  // a network/server problem keeps it (and returns false so the caller can try again).
  const restore = useCallback(async (): Promise<boolean> => {
    if (!tokens.access) {
      setUser(null);
      return true;
    }
    try {
      const u = await auth.fetchProfile();
      if (!u) tokens.clear();
      setUser(u);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const wait of [0, 1500, 4000]) {
        if (wait) await new Promise((r) => setTimeout(r, wait));
        if (!alive) return;
        if (await restore()) break;
      }
      if (alive) setIsLoading(false);
    })();

    // the server ended the session, or the customer signed out (here, or in another tab)
    const onChange = (e: Event) => {
      setUser(null);
      if ((e as CustomEvent).detail?.reason === "expired") toast.info("Your session ended — please sign in again.", { id: "session-ended" });
    };
    // another tab signed in / out / switched account
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && !AUTH_STORAGE_KEYS.includes(e.key)) return;
      if (!tokens.access) setUser(null);
      else if (!userRef.current || (e.key === "gb_uid" && e.newValue !== userRef.current.id)) void restore();
    };
    // coming back from the browser's back/forward cache, or a dropped connection: re-check
    const recheck = () => {
      if (!tokens.access && userRef.current) setUser(null);
      else if (tokens.access && !userRef.current) void restore();
    };
    const onPageShow = (e: PageTransitionEvent) => e.persisted && recheck();

    window.addEventListener(AUTH_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", recheck);
    window.addEventListener("focus", recheck);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", recheck);
      window.removeEventListener("focus", recheck);
    };
  }, [restore]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setUser(await auth.login(email.trim(), password));
      return { success: true };
    } catch (e) {
      return { success: false, error: errorMessage(e, "Login failed") };
    }
  }, []);

  const signup = useCallback(async (data: SignupData) => {
    try {
      setUser(await auth.register({ ...data, email: data.email.trim(), name: data.name.trim() }));
      return { success: true };
    } catch (e) {
      return { success: false, error: errorMessage(e, "Registration failed") };
    }
  }, []);

  const logout = useCallback(async () => {
    markLeaving(); // the pages that need an account must not pop the sign-in modal while we head home
    await auth.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const u = await auth.updateProfile({ name: data.name, phone: data.phone });
      setUser((prev) => (prev ? { ...prev, ...u } : u));
      return { success: true };
    } catch (e) {
      return { success: false, error: errorMessage(e) };
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({ user, isAuthenticated: user !== null, isLoading, login, logout, signup, updateProfile }),
    [user, isLoading, login, logout, signup, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
