import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  dark: boolean;
  collapsed: boolean;
  /** chime when a new order arrives */
  sound: boolean;
  toggleDark: () => void;
  toggleCollapsed: () => void;
  toggleSound: () => void;
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      dark: false,
      collapsed: false,
      sound: true,
      toggleDark: () => set((s) => ({ dark: !s.dark })),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      toggleSound: () => set((s) => ({ sound: !s.sound })),
    }),
    { name: "gb-admin-ui" },
  ),
);
