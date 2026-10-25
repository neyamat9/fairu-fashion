import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { TriangleAlert, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/shared/Field";
import { PageLoader } from "@/components/shared/PageLoader";
import { api, errorMessage } from "@/api/client";
import { AuthInput, AuthShell, authButton } from "./AuthShell";

const passwordRule = z
  .string()
  .min(8, "At least 8 characters")
  .max(128, "At most 128 characters")
  .regex(/[A-Za-z]/, "Add a letter")
  .regex(/\d/, "Add a number");

const schema = z
  .object({ newPassword: passwordRule, confirm: z.string() })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords do not match" });

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const check = useQuery({
    queryKey: ["reset-token", token],
    queryFn: () => api.post("/admin/auth/reset-password/verify", { token }).then((r) => r.data),
    enabled: !!token,
    retry: false,
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (!token || check.isError) {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired.">
        <Button asChild className={`w-full ${authButton}`}>
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </AuthShell>
    );
  }
  if (check.isLoading) return <PageLoader />;

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you don't use elsewhere.">
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit(async (v) => {
          setError(null);
          try {
            await api.post("/admin/auth/reset-password", { token, newPassword: v.newPassword });
            toast.success("Password updated. Please sign in.");
            navigate("/login", { replace: true });
          } catch (e) {
            setError(errorMessage(e));
          }
        })}
      >
        {error && <div role="alert" className="flex items-start gap-2 rounded border border-destructive/30 bg-red-50 px-3 py-2.5 text-sm text-destructive dark:bg-red-500/10"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
        <Field error={errors.newPassword?.message} hint="8–128 characters with at least one letter and one number">
          <AuthInput id="newPassword" type="password" autoComplete="new-password" autoFocus label="New password" icon={<KeyRound />} aria-invalid={!!errors.newPassword} {...register("newPassword")} />
        </Field>
        <Field error={errors.confirm?.message}>
          <AuthInput id="confirm" type="password" autoComplete="new-password" label="Confirm password" icon={<KeyRound />} aria-invalid={!!errors.confirm} {...register("confirm")} />
        </Field>
        <Button type="submit" className={`w-full ${authButton}`} loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
