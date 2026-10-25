import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountApi } from "@/api/system";
import { tokens } from "@/api/client";
import { useAuth } from "@/store/auth";
import { PageHeader } from "@/components/shared/PageHeader";
import { Field, Section } from "@/components/shared/Field";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAct } from "@/hooks/useAct";
import { dateOnly } from "@/lib/format";
import { ProfileSkeleton } from "@/components/shared/pageSkeletons";

const PW = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

export default function Profile() {
  const q = useQuery({ queryKey: ["me"], queryFn: accountApi.me });
  const setUser = useAuth((s) => s.setUser);
  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");

  const save = useAct(() => accountApi.update({ name: (name ?? q.data!.name).trim(), phone: (phone ?? q.data?.phone ?? "").trim() || undefined }), {
    success: "Profile saved", invalidate: [["me"]], onSuccess: (p) => setUser({ id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, avatarUrl: p.avatarUrl }),
  });
  const pw = useAct(() => accountApi.changePassword(cur, next), {
    success: "Password changed. Other devices were signed out.",
    onSuccess: (r) => { tokens.set(r.accessToken, r.refreshToken, tokens.user ?? undefined); setCur(""); setNext(""); setAgain(""); },
  });

  if (q.isLoading || !q.data) return <ProfileSkeleton />;
  const me = q.data;
  const pwErr = next && !PW.test(next) ? "8+ characters with a letter and a number" : again && again !== next ? "Passwords do not match" : undefined;

  return (
    <div>
      <PageHeader refresh={false} title="My account" description="Your details and password." />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Section title="Profile">
          <div className="mb-4 flex items-center gap-3">
            <Avatar className="size-14"><AvatarFallback className="text-lg">{me.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback></Avatar>
            <div><p className="font-semibold">{me.email}</p><p className="text-xs text-muted-foreground">{me.role.replace("_", " ")} · since {dateOnly(me.createdAt)}</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required><Input value={name ?? me.name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Phone"><Input value={phone ?? me.phone ?? ""} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" /></Field>
          </div>
          <Button className="mt-4" size="sm" loading={save.isPending} disabled={!(name ?? me.name).trim()} onClick={() => save.mutate()}>Save profile</Button>
        </Section>
        <Section title="Change password">
          <div className="space-y-3">
            <Field label="Current password"><Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
            <Field label="New password" error={pwErr && next && !PW.test(next) ? pwErr : undefined}><Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
            <Field label="Repeat new password" error={again && again !== next ? "Passwords do not match" : undefined}><Input type="password" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" /></Field>
            <Button size="sm" loading={pw.isPending} disabled={!cur || !PW.test(next) || next !== again} onClick={() => (next === cur ? toast.error("Choose a different password") : pw.mutate())}>Change password</Button>
          </div>
        </Section>
      </div>
    </div>
  );
}
