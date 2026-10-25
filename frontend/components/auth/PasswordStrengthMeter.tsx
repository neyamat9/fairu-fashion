"use client";

/**
 * PasswordStrengthMeter
 *
 * Animated fill bar (0→100%) with color transitions:
 *   - Weak   (score 1/4): red    (#EF4444)
 *   - Fair   (score 2/4): orange (#F99B10)
 *   - Good   (score 3/4): yellow (#EAB308)
 *   - Strong (score 4/4): green  (#22C55E)
 *
 * 300ms smooth transition on width and background-color.
 */

interface PasswordStrengthMeterProps {
  password: string;
}

interface StrengthResult {
  score: number;       // 0–4
  label: string;
  color: string;
  bgColor: string;
  width: string;       // percentage string
}

function getStrength(password: string): StrengthResult {
  if (!password) {
    return { score: 0, label: "", color: "transparent", bgColor: "transparent", width: "0%" };
  }

  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Complexity checks
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Clamp to 1–4 if password exists
  const clamped = Math.min(4, Math.max(1, score)) as 1 | 2 | 3 | 4;

  const levels: Record<1 | 2 | 3 | 4, Omit<StrengthResult, "score">> = {
    1: { label: "Weak",   color: "#EF4444", bgColor: "rgba(239,68,68,0.15)",   width: "25%" },
    2: { label: "Fair",   color: "var(--brand-orange)", bgColor: "rgba(249,115,22,0.15)",  width: "50%" },
    3: { label: "Good",   color: "#CA8A04", bgColor: "rgba(234,179,8,0.15)",   width: "75%" },
    4: { label: "Strong", color: "#22C55E", bgColor: "rgba(34,197,94,0.15)",   width: "100%" },
  };

  return { score: clamped, ...levels[clamped] };
}

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = getStrength(password);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5" role="status" aria-live="polite" aria-label={`Password strength: ${strength.label}`}>
      {/* Bar track */}
      <div
        className="w-full h-1.5 rounded overflow-hidden"
        style={{ background: "color-mix(in srgb, var(--foreground) 10%, transparent)" }}
      >
        {/* Fill bar */}
        <div
          className="h-full rounded"
          style={{
            width: strength.width,
            backgroundColor: strength.color,
            transition: "width 300ms ease-out, background-color 300ms ease-out",
            boxShadow: `0 0 8px ${strength.color}60`,
          }}
        />
      </div>

      {/* Label + requirements */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold"
          style={{
            color: strength.color,
            transition: "color 300ms ease-out",
          }}
        >
          {strength.label}
        </span>
        <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
          {password.length < 8
            ? `${8 - password.length} more chars needed`
            : strength.score < 4
            ? "Add symbols or numbers"
            : "Great password!"}
        </span>
      </div>

      {/* Requirement chips */}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {[
          { label: "8+ chars",   met: password.length >= 8 },
          { label: "Uppercase",  met: /[A-Z]/.test(password) },
          { label: "Number",     met: /[0-9]/.test(password) },
          { label: "Symbol",     met: /[^A-Za-z0-9]/.test(password) },
        ].map((req) => (
          <span
            key={req.label}
            className="text-[10px] px-2 py-0.5 rounded font-medium"
            style={{
              background: req.met ? "rgba(34,197,94,0.12)" : "color-mix(in srgb, var(--foreground) 5%, transparent)",
              color: req.met ? "#16A34A" : "var(--muted-foreground)",
              border: `1px solid ${req.met ? "rgba(34,197,94,0.3)" : "color-mix(in srgb, var(--foreground) 14%, transparent)"}`,
              transition: "all 300ms ease-out",
            }}
          >
            {req.met ? "✓ " : ""}{req.label}
          </span>
        ))}
      </div>
    </div>
  );
}
