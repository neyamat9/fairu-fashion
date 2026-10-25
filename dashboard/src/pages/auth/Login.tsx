import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Mail, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/Field";
import { errorMessage } from "@/api/client";
import { useAuth } from "@/store/auth";
import { AuthInput, AuthShell, authButton } from "./AuthShell";

const schema = z.object({
  email: z.string().min(1, "Enter your email").email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
  remember: z.boolean().optional(),
});
type Form = z.infer<typeof schema>;

export default function Login() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const loc = useLocation();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [caps, setCaps] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const submit = handleSubmit(async (v) => {
    setError(null);
    try {
      await login(v.email, v.password, !!v.remember);
      toast.success("Welcome back");
      navigate((loc.state as { from?: string } | null)?.from ?? "/", { replace: true });
    } catch (e) {
      setError(errorMessage(e, "Could not sign in"));
    }
  });

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your store.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded border border-destructive/30 bg-red-50 px-3 py-2.5 text-sm text-destructive dark:bg-red-500/10">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Field error={errors.email?.message}>
          <AuthInput id="email" type="email" autoComplete="username" autoFocus label="Email address" icon={<Mail />} aria-invalid={!!errors.email} {...register("email")} />
        </Field>
        <Field error={errors.password?.message}>
          <AuthInput
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            label="Password"
            icon={<KeyRound />}
            aria-invalid={!!errors.password}
            onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
            {...register("password", { onBlur: () => setCaps(false) })}
            right={
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="flex size-9 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            }
          />
          {caps && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
              <TriangleAlert className="size-3" /> Caps Lock is on
            </p>
          )}
        </Field>
        <div className="flex items-center justify-between gap-3">
          <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-muted-foreground">
            <input type="checkbox" className="peer sr-only" {...register("remember")} />
            <span className="flex size-[18px] items-center justify-center rounded border border-input bg-card text-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-focus-visible:ring-4 peer-focus-visible:ring-ring/20 dark:peer-checked:border-orange-500 dark:peer-checked:bg-orange-500 dark:peer-checked:text-orange-950">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            Remember me
          </label>
          <Link to="/forgot-password" className="text-[13px] font-semibold text-primary hover:underline dark:text-orange-400">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className={`group w-full ${authButton}`} loading={isSubmitting}>
          Sign in <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
        </Button>
      </form>
    </AuthShell>
  );
}
