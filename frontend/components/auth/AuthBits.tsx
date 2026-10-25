"use client";

import { useBlockClose } from "@/components/auth/auth-busy";
import { useMascot } from "@/components/auth/RobotMascot";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

/** Tells the robot what a small form is doing (thinking while busy, sad on error, happy when done). */
export function useMascotStatus(busy: boolean, error: string | null, done = false) {
  const mascot = useMascot();
  useBlockClose(busy);
  useEffect(() => {
    mascot.setStatus(busy ? "loading" : done ? "success" : error ? "error" : "idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, error, done]);
}

export function AuthSubmit({ busy, disabled, children, busyText }: { busy: boolean; disabled?: boolean; children: React.ReactNode; busyText: string }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="group relative flex h-13 w-full items-center justify-center gap-2 overflow-hidden rounded bg-linear-to-r from-primary to-[#1d6ac9] py-3.5 text-base font-bold text-white shadow-[0_12px_28px_-10px_rgba(5,57,114,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-10px_rgba(249,155,16,0.6)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      <span className="relative flex items-center gap-2">
        {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {busy ? busyText : children}
      </span>
    </button>
  );
}
