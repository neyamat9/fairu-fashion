import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

// The mouse wheel must never change a number: browsers add or subtract 1 from a focused number box when you scroll over it
// (prices, stock, quantities…). Letting go of the box as soon as the wheel turns stops that, and the page just scrolls.
document.addEventListener(
  "wheel",
  () => {
    const el = document.activeElement;
    if (el instanceof HTMLInputElement && el.type === "number") el.blur();
  },
  { passive: true, capture: true },
);

// apply the saved theme before the first paint
try {
  const ui = JSON.parse(localStorage.getItem("gb-admin-ui") ?? "{}") as { state?: { dark?: boolean } };
  document.documentElement.classList.toggle("dark", !!ui.state?.dark);
} catch {
  /* default theme */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
