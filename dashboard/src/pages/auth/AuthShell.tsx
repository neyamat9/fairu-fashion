import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Outlet } from "react-router";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/** The one button of the sign-in forms: wide, softly rounded, gradient with a lift on hover. */
export const authButton =
  "h-13 rounded bg-linear-to-r from-navy-700 via-navy-600 to-sky-500 px-8 text-[15px] font-semibold text-white shadow-lg shadow-navy-700/25 transition-all hover:-translate-y-0.5 hover:from-navy-600 hover:to-sky-400 hover:shadow-xl hover:shadow-navy-700/30 active:translate-y-0 dark:from-orange-500 dark:via-orange-500 dark:to-orange-400 dark:text-orange-950 dark:shadow-orange-500/20";

interface AuthInputProps extends Omit<ComponentProps<"input">, "placeholder"> {
  label: string;
  icon: ReactNode;
  /** something clickable on the right of the box (e.g. the show-password eye) */
  right?: ReactNode;
}

/**
 * A modern input: icon on the left, the label sits inside the box and floats up when you click or type.
 * (the empty placeholder is what lets CSS tell "empty" from "filled")
 */
export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(function AuthInput({ label, icon, right, className, ...props }, ref) {
  return (
    <div className="relative">
      <input
        ref={ref}
        placeholder=" "
        className={cn(
          "peer h-14 w-full rounded border border-input bg-card pb-1.5 pl-12 pt-5 text-[15px] text-foreground shadow-xs outline-none transition-[border-color,box-shadow] duration-150",
          "hover:border-ring/50 focus:border-ring focus:ring-4 focus:ring-ring/15 aria-invalid:border-destructive aria-invalid:focus:ring-destructive/15",
          right ? "pr-12" : "pr-4",
          className,
        )}
        {...props}
      />
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors peer-focus:text-brand [&_svg]:size-5">{icon}</span>
      <label
        htmlFor={props.id}
        className={cn(
          "pointer-events-none absolute left-12 top-1/2 origin-left -translate-y-1/2 text-[15px] text-muted-foreground transition-all duration-150",
          "peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-primary dark:peer-focus:text-orange-400",
          "peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold",
          "peer-autofill:top-2.5 peer-autofill:translate-y-0 peer-autofill:text-[11px] peer-autofill:font-semibold",
        )}
      >
        {label}
      </label>
      {right && <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
  );
});

/** Rounded capsules that drift on the colour side. left/bottom in %, size in rem. */
const CAPSULES = [
  { l: -3, b: -6, w: 13, h: 4.6, from: "from-orange-300", to: "to-orange-500", o: 0.95, d: 0 },
  { l: 20, b: 2, w: 16, h: 5.4, from: "from-amber-200", to: "to-orange-400", o: 0.9, d: 1.2 },
  { l: 50, b: -8, w: 11, h: 3.8, from: "from-orange-200", to: "to-amber-400", o: 0.85, d: 2.4 },
  { l: 5, b: 14, w: 8, h: 3, from: "from-sky-200", to: "to-sky-400", o: 0.55, d: 0.6 },
  { l: 68, b: 10, w: 9, h: 3.2, from: "from-white", to: "to-sky-200", o: 0.4, d: 1.8 },
];
const LINES = [
  { l: 14, b: 14, w: 6 },
  { l: 42, b: 18, w: 5 },
  { l: 62, b: 24, w: 7 },
  { l: 78, b: 12, w: 6 },
];

/**
 * Frame shared by sign-in, forgot- and reset-password. It stays on screen while you move between them, so only the form changes: a big split panel on a colourful backdrop.
 * Colour side (welcome words, drifting capsules) on the left, the form on the right. On phones the colour side
 * becomes a short banner above the form.
 */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-linear-to-br from-navy-900 via-navy-700 to-sky-500 p-3 sm:p-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-40 size-160 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="absolute -bottom-52 -right-40 size-160 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="auth-grid absolute inset-0 opacity-[0.06]" />
      </div>

      <div className="auth-rise relative grid w-full max-w-5xl overflow-hidden rounded bg-card shadow-2xl shadow-navy-950/50 lg:min-h-[min(38rem,calc(100dvh-5rem))] lg:grid-cols-2">
        {/* ------------------------------ colour side ------------------------------ */}
        <section className="relative isolate flex min-h-52 flex-col justify-center overflow-hidden bg-linear-to-br from-navy-700 via-navy-600 to-sky-500 p-8 text-white sm:min-h-60 lg:min-h-0 lg:p-14">
          <div className="pointer-events-none absolute -right-16 top-10 -z-10 size-72 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
            {CAPSULES.map((c, i) => (
              <span
                key={i}
                className={`auth-capsule absolute rounded-full bg-linear-to-b ${c.from} ${c.to} max-lg:hidden`}
                style={{ left: `${c.l}%`, bottom: `${c.b}%`, width: `${c.w}rem`, height: `${c.h}rem`, opacity: c.o, animationDelay: `${c.d}s`, ["--r" as string]: "-58deg", transform: "rotate(-58deg)" }}
              />
            ))}
            {LINES.map((l, i) => (
              <span key={i} className="absolute h-0.5 rounded-full bg-white/60 max-lg:hidden" style={{ left: `${l.l}%`, bottom: `${l.b}%`, width: `${l.w}rem`, transform: "rotate(-58deg)" }} />
            ))}
            <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-sky-200/40 blur-xl lg:hidden" />
          </div>

          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded bg-white p-1 shadow-lg shadow-black/20">
              <img src="/logo-mark.png" alt="Fairu Fashion" className="size-full object-contain" />
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">
              Fairu <span className="text-orange-300">Fashion</span>
              <span className="ml-1.5 rounded border border-white/30 bg-white/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-widest">Admin</span>
            </span>
          </div>
          <h2 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Welcome to
            <br />
            <span className="text-orange-300">Fairu Fashion</span>
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/85 sm:text-base">Sign in to manage dresses, collections, stock, orders and everything your boutique needs.</p>
        </section>

        {/* ------------------------------ form side ------------------------------ */}
        <section className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14">
          <Outlet />
        </section>
      </div>

      <p className="relative mt-5 text-center text-xs text-white/75">© {new Date().getFullYear()} Fairu Fashion · Elegance in Every Stitch</p>
    </div>
  );
}

/** What each sign-in page puts in the form side. Moving between pages cross-fades/slides just this part. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  // browsers with View Transitions animate the swap (old slides out, new slides in); the rest get a simple slide-in
  const native = typeof document !== "undefined" && "startViewTransition" in document;
  return (
    <div className={cn("auth-form mx-auto w-full max-w-sm", !native && "auth-swap")}>
      <span className="inline-flex items-center gap-1.5 rounded bg-navy-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary dark:bg-secondary dark:text-orange-400">
        <ShieldCheck className="size-3.5" /> Admin portal
      </span>
      <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-7">{children}</div>
      <p className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">Staff only. Trouble signing in? Ask the store owner to reset your access.</p>
    </div>
  );
}
