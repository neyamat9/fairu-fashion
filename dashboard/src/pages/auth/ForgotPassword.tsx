import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail, MailCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/Field";
import { api, errorMessage } from "@/api/client";
import { AuthInput, AuthShell, authButton } from "./AuthShell";

const schema = z.object({ email: z.string().min(1, "Enter your email").email("Enter a valid email") });

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a link to set a new password.">
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded border border-emerald-200 bg-emerald-50 text-success dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <MailCheck />
          </div>
          <p className="text-sm text-muted-foreground">If that email belongs to an admin account, a reset link is on its way. It is valid for a short time.</p>
          <Button asChild variant="outline" className="h-13 w-full rounded">
            <Link to="/login" viewTransition><ArrowLeft /> Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit(async (v) => {
            setError(null);
            try {
              await api.post("/admin/auth/forgot-password", v);
              setSent(true);
            } catch (e) {
              setError(errorMessage(e));
            }
          })}
        >
          {error && <div role="alert" className="flex items-start gap-2 rounded border border-destructive/30 bg-red-50 px-3 py-2.5 text-sm text-destructive dark:bg-red-500/10"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
          <Field error={errors.email?.message}>
            <AuthInput id="email" type="email" autoFocus label="Email address" icon={<Mail />} aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <Button type="submit" className={`w-full ${authButton}`} loading={isSubmitting}>
            Send reset link
          </Button>
          <Link to="/login" viewTransition className="flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-orange-400">
            <ArrowLeft className="size-3.5" /> Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
