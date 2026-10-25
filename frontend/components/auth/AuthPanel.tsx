"use client";

import RobotMascot, { MascotProvider } from "@/components/auth/RobotMascot";

/**
 * The robot perched on top of the form card. Owns the mascot state, so everything inside
 * (AuthField, AuthForm…) can talk to the robot.
 */
export function AuthPanel({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <MascotProvider>
      <div className="w-full max-w-[440px]">
        <div data-auth-robot className={`relative z-0 flex justify-center ${compact ? "-mb-7" : "-mb-9"}`}>
          <RobotMascot className={compact ? "h-32 w-auto sm:h-40" : "h-[10.5rem] w-auto sm:h-48"} />
        </div>
        <div
          data-auth-card
          className="relative z-10 rounded border border-border bg-card/95 p-6 shadow-[0_30px_70px_-25px_rgba(5,57,114,0.45)] backdrop-blur sm:p-8"
        >
          <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-brand-orange to-sky-400" aria-hidden="true" />
          {children}
        </div>
      </div>
    </MascotProvider>
  );
}
