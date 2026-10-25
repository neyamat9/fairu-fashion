"use client";

import { useMascot } from "@/components/auth/RobotMascot";
import { AlertCircle, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

interface AuthFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
  /** Password field: shows the eye toggle and makes the robot cover its eyes */
  password?: boolean;
  /** Rendered under the input (e.g. a strength meter) */
  children?: React.ReactNode;
}

/**
 * One form row for every auth page. It also drives the robot mascot:
 *  - a text field makes the robot watch and follow the caret;
 *  - a password field makes it cover its eyes — or peek, while the eye icon shows the password.
 */
export default function AuthField({ id, label, value, onChange, icon: Icon, type = "text", placeholder, autoComplete, error, disabled, password, children }: AuthFieldProps) {
  const mascot = useMascot();
  const input = useRef<HTMLInputElement>(null);
  const [visible, setVisible] = useState(false);

  // where the caret sits (0 = start … 1 = ~22 characters in) → where the robot looks
  function follow(el: HTMLInputElement) {
    if (password) return;
    const caret = el.selectionStart ?? el.value.length;
    mascot.setLook(-0.7 + 1.7 * Math.min(1, caret / 22));
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
      </label>

      <div className="group relative">
        <span
          className={`pointer-events-none absolute left-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded transition-colors duration-200 ${
            error ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary group-focus-within:bg-brand-orange group-focus-within:text-on-orange dark:text-brand-blue"
          }`}
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>

        <input
          ref={input}
          id={id}
          name={id}
          type={password ? (visible ? "text" : "password") : type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => {
            onChange(e.target.value);
            follow(e.target);
          }}
          onFocus={(e) => {
            mascot.setField(password ? "password" : "text", visible);
            follow(e.currentTarget);
          }}
          onBlur={() => mascot.setField(null)}
          onKeyUp={(e) => follow(e.currentTarget)}
          onClick={(e) => follow(e.currentTarget)}
          className={`h-12 w-full rounded border-2 bg-background pl-12 text-sm font-medium text-foreground outline-none transition-all duration-200 placeholder:font-normal placeholder:text-muted-foreground/80 disabled:opacity-60 ${
            password ? "pr-12" : "pr-4"
          } ${error ? "border-destructive/60 focus:border-destructive focus:ring-4 focus:ring-destructive/15" : "border-input hover:border-primary/40 focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/20"}`}
        />

        {password && (
          <button
            type="button"
            // keep focus in the input so the robot doesn't drop its hands when the icon is pressed
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const next = !visible;
              setVisible(next);
              input.current?.focus();
              mascot.setField("password", next);
            }}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>

      {children}

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
