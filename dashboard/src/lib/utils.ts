import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { prepareTabHandoff } from "@/api/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Open an admin page in a new browser tab (the login is shared between tabs). */
export function openInNewTab(path: string) {
  prepareTabHandoff();
  window.open(path, "_blank", "noopener,noreferrer");
}
