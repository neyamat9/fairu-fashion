"use client";

/**
 * StepIndicator — 3-step checkout progress bar
 *
 * Steps: Shipping (1) → Payment (2) → Review (3)
 * - Completed steps: orange fill + checkmark icon
 * - Active step: orange ring with pulsing animation
 * - Upcoming steps: muted/dimmed
 */

interface Step {
  id: number;
  label: string;
  shortLabel: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Shipping Info", shortLabel: "Shipping" },
  { id: 2, label: "Payment Method", shortLabel: "Payment" },
  { id: 3, label: "Review & Confirm", shortLabel: "Review" },
];

interface StepIndicatorProps {
  currentStep: number; // 1 | 2 | 3
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <li key={step.id} className="flex items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-2">
                {/* Circle */}
                <div className="relative flex items-center justify-center">
                  {/* Pulsing ring for active step */}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded border-2 border-brand-orange animate-ping opacity-40"
                      aria-hidden="true"
                    />
                  )}

                  <div
                    className={[
                      "relative w-10 h-10 rounded flex items-center justify-center font-bold text-sm transition-all duration-300 z-10",
                      isCompleted
                        ? "bg-primary text-white shadow-[0_0_16px_rgba(249,155,16,0.4)]"
                        : isActive
                        ? "bg-brand-orange/15 border-2 border-brand-orange text-accent-text shadow-[0_0_20px_rgba(249,155,16,0.25)]"
                        : "bg-muted border-2 border-border text-muted-foreground/70",
                    ].join(" ")}
                    aria-current={isActive ? "step" : undefined}
                  >
                    {isCompleted ? (
                      /* Checkmark icon */
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </div>
                </div>

                {/* Label */}
                <span
                  className={[
                    "text-xs font-medium transition-colors duration-300 text-center leading-tight",
                    isCompleted
                      ? "text-accent-text"
                      : isActive
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground/70",
                  ].join(" ")}
                >
                  {/* Show short label on mobile, full label on sm+ */}
                  <span className="sm:hidden">{step.shortLabel}</span>
                  <span className="hidden sm:inline">{step.label}</span>
                </span>
              </div>

              {/* Connector line between steps */}
              {!isLast && (
                <div
                  className={[
                    "h-[2px] w-16 sm:w-24 md:w-32 mx-2 mb-5 rounded transition-all duration-500",
                    isCompleted
                      ? "bg-brand-orange shadow-[0_0_8px_rgba(249,155,16,0.4)]"
                      : "bg-secondary",
                  ].join(" ")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
