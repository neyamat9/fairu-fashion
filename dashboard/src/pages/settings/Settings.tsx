import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { settingsApi, type Settings as S, type SettingsGroup } from "@/api/system";
import { errorMessage } from "@/api/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Field, Section } from "@/components/shared/Field";
import { ImageField } from "@/components/shared/ImageField";
import { ErrorState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input, Select, Switch, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAct } from "@/hooks/useAct";
import { useUrlState } from "@/hooks/useUrlState";
import { SettingsSkeleton } from "@/components/shared/pageSkeletons";

const nz = (v: string) => (v.trim() === "" ? null : v.trim());
const Toggle = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex cursor-pointer items-start justify-between gap-4 py-2">
    <span><span className="block text-[13px] font-medium">{label}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);

function useSave(group: SettingsGroup) {
  return useAct((body: Record<string, unknown>) => settingsApi.save(group, body), { success: "Settings saved", invalidate: [["settings"]] });
}

function SiteForm({ v }: { v: S["site"] }) {
  const [f, setF] = useState({ ...v, contactEmail: v.contactEmail ?? "", hotline: v.hotline ?? "", whatsapp: v.whatsapp ?? "", address: v.address ?? "", businessHours: v.businessHours ?? "", metaTitle: v.metaTitle ?? "", metaDescription: v.metaDescription ?? "" });
  const [social, setSocial] = useState<Record<string, string>>(v.socialLinks ?? {});
  const save = useSave("site");
  const submit = () => {
    if (!f.storeName.trim()) return toast.error("Store name is required");
    if (f.contactEmail && !/^\S+@\S+\.\S+$/.test(f.contactEmail)) return toast.error("Enter a valid contact email");
    save.mutate({ storeName: f.storeName.trim(), tagline: f.tagline, logoUrl: f.logoUrl, faviconUrl: f.faviconUrl, contactEmail: nz(f.contactEmail), hotline: nz(f.hotline), whatsapp: nz(f.whatsapp), address: nz(f.address), businessHours: nz(f.businessHours), currency: f.currency, currencySymbol: f.currencySymbol, metaTitle: nz(f.metaTitle), metaDescription: nz(f.metaDescription), socialLinks: Object.fromEntries(Object.entries(social).filter(([, x]) => x.trim())) });
  };
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="Store">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2"><Field label="Store name" required><Input value={f.storeName} onChange={(e) => setF({ ...f, storeName: e.target.value })} /></Field><Field label="Tagline"><Input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} /></Field></div>
          <div className="grid gap-3 sm:grid-cols-2"><ImageField label="Logo" folder="site" value={f.logoUrl} onChange={(logoUrl) => setF({ ...f, logoUrl })} /><ImageField label="Favicon" folder="site" value={f.faviconUrl} onChange={(faviconUrl) => setF({ ...f, faviconUrl })} /></div>
        </div>
      </Section>
      <Section title="Contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact email"><Input type="email" value={f.contactEmail} onChange={(e) => setF({ ...f, contactEmail: e.target.value })} /></Field>
          <Field label="Hotline"><Input value={f.hotline} onChange={(e) => setF({ ...f, hotline: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} /></Field>
          <Field label="Business hours"><Input value={f.businessHours} onChange={(e) => setF({ ...f, businessHours: e.target.value })} placeholder="Sat–Thu, 10am–8pm" /></Field>
          <Field label="Address" className="sm:col-span-2"><Textarea rows={2} value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
        </div>
      </Section>
      <Section title="Social links">
        <div className="grid gap-3 sm:grid-cols-2">{["facebook", "instagram", "youtube", "tiktok", "twitter", "linkedin"].map((k) => <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><Input value={social[k] ?? ""} onChange={(e) => setSocial({ ...social, [k]: e.target.value })} placeholder="https://" /></Field>)}</div>
      </Section>
      <Section title="Search engines">
        <div className="space-y-3"><Field label="Meta title"><Input value={f.metaTitle} onChange={(e) => setF({ ...f, metaTitle: e.target.value })} /></Field><Field label="Meta description"><Textarea rows={2} value={f.metaDescription} onChange={(e) => setF({ ...f, metaDescription: e.target.value })} /></Field></div>
      </Section>
      <Button loading={save.isPending} onClick={submit}>Save store settings</Button>
    </div>
  );
}

type MobileKey = "bkash" | "nagad" | "rocket";
const MOBILE: { key: MobileKey; label: string; hint: string }[] = [
  { key: "bkash", label: "bKash", hint: "Customers send money to your bKash number and enter the transaction ID." },
  { key: "nagad", label: "Nagad", hint: "Customers send money to your Nagad number and enter the transaction ID." },
  { key: "rocket", label: "Rocket", hint: "Customers send money to your Rocket number and enter the transaction ID." },
];

function PaymentForm({ v }: { v: S["payment"] }) {
  const [f, setF] = useState({
    ...v,
    bkashNumber: v.bkashNumber ?? "", bkashInstructions: v.bkashInstructions ?? "",
    nagadNumber: v.nagadNumber ?? "", nagadInstructions: v.nagadInstructions ?? "",
    rocketNumber: v.rocketNumber ?? "", rocketInstructions: v.rocketInstructions ?? "",
  });
  const save = useSave("payment");
  const submit = () => {
    if (!f.codEnabled && !f.bkashEnabled && !f.nagadEnabled && !f.rocketEnabled) return toast.error("Keep at least one payment method on");
    for (const m of MOBILE) {
      if (f[`${m.key}Enabled`] && !/^(\+?88)?01[3-9]\d{8}$/.test(f[`${m.key}Number`].replace(/[\s-]/g, ""))) return toast.error(`Enter your ${m.label} number to accept ${m.label}`);
    }
    save.mutate({
      codEnabled: f.codEnabled,
      bkashEnabled: f.bkashEnabled, bkashNumber: nz(f.bkashNumber), bkashAccountType: f.bkashAccountType, bkashInstructions: nz(f.bkashInstructions),
      nagadEnabled: f.nagadEnabled, nagadNumber: nz(f.nagadNumber), nagadAccountType: f.nagadAccountType, nagadInstructions: nz(f.nagadInstructions),
      rocketEnabled: f.rocketEnabled, rocketNumber: nz(f.rocketNumber), rocketAccountType: f.rocketAccountType, rocketInstructions: nz(f.rocketInstructions),
    });
  };
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="Payment methods" description="Customers choose one at checkout. Mobile banking: they send money to your number and type the transaction ID; you verify it on the order.">
        <div className="divide-y divide-border">
          <Toggle label="Cash on delivery" hint="Customers pay the courier." checked={f.codEnabled} onChange={(codEnabled) => setF({ ...f, codEnabled })} />
          {MOBILE.map((m) => (
            <div key={m.key}>
              <Toggle label={`${m.label} (send money)`} hint={m.hint} checked={f[`${m.key}Enabled`]} onChange={(on) => setF({ ...f, [`${m.key}Enabled`]: on })} />
              {f[`${m.key}Enabled`] && (
                <div className="mb-3 grid gap-3 sm:grid-cols-2">
                  <Field label={`${m.label} number`} required><Input value={f[`${m.key}Number`]} onChange={(e) => setF({ ...f, [`${m.key}Number`]: e.target.value })} placeholder="01XXXXXXXXX" /></Field>
                  <Field label="Account type"><Select value={f[`${m.key}AccountType`]} onChange={(e) => setF({ ...f, [`${m.key}AccountType`]: e.target.value })}><option value="personal">Personal</option><option value="merchant">Merchant</option><option value="agent">Agent</option></Select></Field>
                  <Field label="Instructions shown to the customer" className="sm:col-span-2"><Textarea rows={3} value={f[`${m.key}Instructions`]} onChange={(e) => setF({ ...f, [`${m.key}Instructions`]: e.target.value })} /></Field>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>
      <Button loading={save.isPending} onClick={submit}>Save payment settings</Button>
    </div>
  );
}

function ShippingForm({ v }: { v: S["shipping"] }) {
  const [f, setF] = useState({ ...v, freeShippingThreshold: v.freeShippingThreshold === null ? "" : String(v.freeShippingThreshold), cities: v.insideDhakaCities.join(", ") });
  const save = useSave("shipping");
  const n = (k: keyof typeof f, label: string) => (
    <Field label={label}><Input type="number" min={0} value={String(f[k] as number)} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></Field>
  );
  const submit = () => {
    const pairs: [number, number, string][] = [[f.globalMinDays, f.globalMaxDays, "Standard"], [f.insideDhakaMinDays, f.insideDhakaMaxDays, "Inside Dhaka"], [f.outsideDhakaMinDays, f.outsideDhakaMaxDays, "Outside Dhaka"]];
    const badPair = pairs.find(([a, b]) => a > b);
    if (badPair) return toast.error(`${badPair[2]}: the fastest days cannot be more than the slowest`);
    save.mutate({
      mode: f.mode, globalRate: f.globalRate, globalMinDays: f.globalMinDays, globalMaxDays: f.globalMaxDays,
      insideDhakaRate: f.insideDhakaRate, insideDhakaMinDays: f.insideDhakaMinDays, insideDhakaMaxDays: f.insideDhakaMaxDays,
      outsideDhakaRate: f.outsideDhakaRate, outsideDhakaMinDays: f.outsideDhakaMinDays, outsideDhakaMaxDays: f.outsideDhakaMaxDays,
      insideDhakaCities: f.cities.split(",").map((s) => s.trim()).filter(Boolean),
      freeShippingThreshold: f.freeShippingThreshold === "" ? null : Number(f.freeShippingThreshold),
    });
  };
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="How shipping is charged">
        <Field label="Mode"><Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value as "GLOBAL" | "ZONE" })} className="max-w-xs"><option value="ZONE">By area: inside / outside Dhaka</option><option value="GLOBAL">One rate everywhere</option></Select></Field>
        {f.mode === "GLOBAL" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">{n("globalRate", "Rate ৳")}{n("globalMinDays", "Fastest (days)")}{n("globalMaxDays", "Slowest (days)")}</div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">{n("insideDhakaRate", "Inside Dhaka rate ৳")}{n("insideDhakaMinDays", "Fastest (days)")}{n("insideDhakaMaxDays", "Slowest (days)")}</div>
            <div className="grid gap-3 sm:grid-cols-3">{n("outsideDhakaRate", "Outside Dhaka rate ৳")}{n("outsideDhakaMinDays", "Fastest (days)")}{n("outsideDhakaMaxDays", "Slowest (days)")}</div>
            <Field label="Districts counted as 'inside Dhaka'" hint="Comma separated"><Input value={f.cities} onChange={(e) => setF({ ...f, cities: e.target.value })} /></Field>
          </div>
        )}
      </Section>
      <Section title="Free shipping"><Field label="Free shipping on orders from ৳" hint="Empty = never free"><Input type="number" min={0} value={f.freeShippingThreshold} onChange={(e) => setF({ ...f, freeShippingThreshold: e.target.value })} className="max-w-xs" /></Field></Section>
      <Button loading={save.isPending} onClick={submit}>Save shipping settings</Button>
    </div>
  );
}

function ReturnsForm({ v }: { v: S["returns"] }) {
  const [f, setF] = useState({ ...v, policyText: v.policyText ?? "" });
  const save = useSave("returns");
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="Returns">
        <Toggle label="Accept returns" hint="Turn off to stop new return requests." checked={f.returnsEnabled} onChange={(returnsEnabled) => setF({ ...f, returnsEnabled })} />
        <div className="mt-2 space-y-3">
          <Field label="Return window (days after delivery)"><Input type="number" min={0} max={365} value={f.returnWindowDays} onChange={(e) => setF({ ...f, returnWindowDays: Number(e.target.value) })} className="max-w-[160px]" /></Field>
          <Field label="Policy text shown to customers"><Textarea rows={5} value={f.policyText} onChange={(e) => setF({ ...f, policyText: e.target.value })} /></Field>
        </div>
      </Section>
      <Button loading={save.isPending} onClick={() => save.mutate({ returnsEnabled: f.returnsEnabled, returnWindowDays: f.returnWindowDays, policyText: nz(f.policyText) })}>Save return settings</Button>
    </div>
  );
}

function EmailForm({ v }: { v: S["email"] }) {
  const [f, setF] = useState({ ...v, replyTo: v.replyTo ?? "", smtpHost: v.smtpHost ?? "", smtpPort: v.smtpPort ? String(v.smtpPort) : "", smtpUser: v.smtpUser ?? "", adminNotificationEmail: v.adminNotificationEmail ?? "" });
  const [smtpPass, setSmtpPass] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [to, setTo] = useState("");
  const body = () => ({
    provider: f.provider, fromName: f.fromName, fromEmail: f.fromEmail, replyTo: nz(f.replyTo),
    smtpHost: nz(f.smtpHost), smtpPort: f.smtpPort ? Number(f.smtpPort) : null, smtpSecure: f.smtpSecure, smtpUser: nz(f.smtpUser),
    ...(smtpPass ? { smtpPass } : {}), ...(resendKey ? { resendApiKey: resendKey } : {}),
    adminNotificationEmail: nz(f.adminNotificationEmail),
    notifyCustomerOrderPlaced: f.notifyCustomerOrderPlaced, notifyCustomerOrderStatus: f.notifyCustomerOrderStatus, notifyAdminNewOrder: f.notifyAdminNewOrder,
    notifyAdminContactMessage: f.notifyAdminContactMessage, notifyAdminSupportTicket: f.notifyAdminSupportTicket, notifyCustomerTicketReply: f.notifyCustomerTicketReply, sendNewsletterWelcome: f.sendNewsletterWelcome,
  });
  const save = useSave("email");
  const test = useAct(() => settingsApi.testEmail(to.trim(), body()), { success: "Test email sent — check the inbox" });
  const set = <K extends keyof typeof f>(k: K, val: (typeof f)[K]) => setF({ ...f, [k]: val });
  return (
    <div className="grid items-start gap-4 xl:grid-cols-2 [&>button]:justify-self-start xl:[&>button]:col-span-2">
      <Section title="Sending emails">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Provider"><Select value={f.provider} onChange={(e) => set("provider", e.target.value as S["email"]["provider"])}><option value="none">Off (no emails)</option><option value="smtp">SMTP</option><option value="resend">Resend</option></Select></Field>
            <Field label="From name"><Input value={f.fromName} onChange={(e) => set("fromName", e.target.value)} /></Field>
            <Field label="From email"><Input type="email" value={f.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} /></Field>
          </div>
          {f.provider === "smtp" && (
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="SMTP host"><Input value={f.smtpHost} onChange={(e) => set("smtpHost", e.target.value)} /></Field>
              <Field label="Port"><Input type="number" value={f.smtpPort} onChange={(e) => set("smtpPort", e.target.value)} /></Field>
              <Field label="User"><Input value={f.smtpUser} onChange={(e) => set("smtpUser", e.target.value)} autoComplete="off" /></Field>
              <Field label="Password" hint={v.smtpPassSet ? "Saved — leave empty to keep" : undefined}><Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} autoComplete="new-password" /></Field>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] sm:col-span-4"><Switch checked={f.smtpSecure} onCheckedChange={(x) => set("smtpSecure", x)} />Use SSL/TLS (port 465)</label>
            </div>
          )}
          {f.provider === "resend" && <Field label="Resend API key" hint={v.resendApiKeySet ? "Saved — leave empty to keep" : undefined}><Input type="password" value={resendKey} onChange={(e) => setResendKey(e.target.value)} autoComplete="new-password" /></Field>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Reply-to email"><Input type="email" value={f.replyTo} onChange={(e) => set("replyTo", e.target.value)} /></Field>
            <Field label="Send admin alerts to"><Input type="email" value={f.adminNotificationEmail} onChange={(e) => set("adminNotificationEmail", e.target.value)} /></Field>
          </div>
        </div>
      </Section>
      <Section title="Which emails to send">
        <div className="divide-y divide-border">
          <Toggle label="Customer: order placed" checked={f.notifyCustomerOrderPlaced} onChange={(x) => set("notifyCustomerOrderPlaced", x)} />
          <Toggle label="Customer: order status changes" checked={f.notifyCustomerOrderStatus} onChange={(x) => set("notifyCustomerOrderStatus", x)} />
          <Toggle label="Customer: reply to their support ticket" checked={f.notifyCustomerTicketReply} onChange={(x) => set("notifyCustomerTicketReply", x)} />
          <Toggle label="Customer: newsletter welcome" checked={f.sendNewsletterWelcome} onChange={(x) => set("sendNewsletterWelcome", x)} />
          <Toggle label="You: new order" checked={f.notifyAdminNewOrder} onChange={(x) => set("notifyAdminNewOrder", x)} />
          <Toggle label="You: new contact message" checked={f.notifyAdminContactMessage} onChange={(x) => set("notifyAdminContactMessage", x)} />
          <Toggle label="You: new support ticket" checked={f.notifyAdminSupportTicket} onChange={(x) => set("notifyAdminSupportTicket", x)} />
        </div>
      </Section>
      <Section title="Send a test email" description="Uses the values above, even before you save.">
        <div className="flex flex-wrap gap-2"><Input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" className="max-w-xs" /><Button variant="outline" disabled={!/^\S+@\S+\.\S+$/.test(to)} loading={test.isPending} onClick={() => test.mutate()}><Mail /> Send test</Button></div>
      </Section>
      <Button loading={save.isPending} onClick={() => save.mutate(body())}>Save email settings</Button>
    </div>
  );
}

export default function Settings() {
  const [f, setF] = useUrlState({ tab: "site" });
  const q = useQuery({ queryKey: ["settings"], queryFn: settingsApi.get });
  if (q.isLoading) return <SettingsSkeleton />;
  if (q.isError || !q.data) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  const s = q.data;
  return (
    <div>
      <PageHeader refresh={false} title="Settings" description="How your store looks, charges and talks to customers." />
      <Tabs value={f.tab} onValueChange={(tab) => setF({ tab })}>
        <TabsList className="mb-4"><TabsTrigger value="site">Store</TabsTrigger><TabsTrigger value="payment">Payment</TabsTrigger><TabsTrigger value="shipping">Shipping</TabsTrigger><TabsTrigger value="returns">Returns</TabsTrigger><TabsTrigger value="email">Email</TabsTrigger></TabsList>
        <div>
          <TabsContent value="site"><SiteForm v={s.site} /></TabsContent>
          <TabsContent value="payment"><PaymentForm v={s.payment} /></TabsContent>
          <TabsContent value="shipping"><ShippingForm v={s.shipping} /></TabsContent>
          <TabsContent value="returns"><ReturnsForm v={s.returns} /></TabsContent>
          <TabsContent value="email"><EmailForm v={s.email} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
