"use client";

import { createContext, useContext, useEffect } from "react";

// The modal must not be closed (Esc, backdrop, ×, Back) while a form is mid-request — the form reports its state here.
export const AuthBusyContext = createContext<(busy: boolean) => void>(() => {});

export function useBlockClose(busy: boolean) {
  const set = useContext(AuthBusyContext);
  useEffect(() => {
    set(busy);
    return () => set(false);
  }, [busy, set]);
}
