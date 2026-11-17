import { useState } from "react";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MessageCircle, Phone, Users, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupportSettings, saveSupportSettings } from "@/lib/support.functions";

export const supportSettingsQuery = queryOptions({
  queryKey: ["admin", "support-settings"],
  queryFn: () => getSupportSettings(),
});

type SupportValues = {
  phone: string;
  whatsapp_number: string;
  support_email: string;
  whatsapp_group_url: string;
  support_hours: string;
  phone_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  group_enabled: boolean;
  floating_button_enabled: boolean;
};

export function SupportSettings() {
  const { data } = useSuspenseQuery(supportSettingsQuery);
  const qc = useQueryClient();
  const save = useServerFn(saveSupportSettings);
  const [values, setValues] = useState<SupportValues>({
    phone: data.phone,
    whatsapp_number: data.whatsapp_number,
    support_email: data.support_email,
    whatsapp_group_url: data.whatsapp_group_url,
    support_hours: data.support_hours,
    phone_enabled: data.phone_enabled,
    whatsapp_enabled: data.whatsapp_enabled,
    email_enabled: data.email_enabled,
    group_enabled: data.group_enabled,
    floating_button_enabled: data.floating_button_enabled,
  });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof SupportValues>(key: K, value: SupportValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: values });
      await qc.invalidateQueries({ queryKey: supportSettingsQuery.queryKey });
      toast.success("Support settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save support settings.");
    } finally {
      setBusy(false);
    }
  }

  const channels = [
    { key: "phone_enabled" as const, title: "Phone support", description: "Show the call option to customers.", icon: Phone },
    { key: "whatsapp_enabled" as const, title: "Chat with admin on WhatsApp", description: "Open a direct WhatsApp chat.", icon: MessageCircle },
    { key: "email_enabled" as const, title: "Email support", description: "Let customers contact the support email.", icon: Mail },
    { key: "group_enabled" as const, title: "Join WhatsApp group", description: "Show the customer community group link.", icon: Users },
  ];

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="mb-4"><h2 className="font-display text-lg font-semibold">Support contact details</h2><p className="text-sm text-muted-foreground">These details are used by the customer support area.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">Business phone number<Input value={values.phone} onChange={(e) => set("phone", e.target.value)} placeholder="e.g. 080..." /></label>
          <label className="space-y-1 text-sm font-medium">WhatsApp admin number<Input value={values.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} placeholder="e.g. 23480..." /></label>
          <label className="space-y-1 text-sm font-medium">Support email<Input type="email" required value={values.support_email} onChange={(e) => set("support_email", e.target.value)} placeholder="smartbrowsers9@gmail.com" /></label>
          <label className="space-y-1 text-sm font-medium">WhatsApp group invite link<Input type="url" value={values.whatsapp_group_url} onChange={(e) => set("whatsapp_group_url", e.target.value)} placeholder="https://chat.whatsapp.com/..." /></label>
          <label className="space-y-1 text-sm font-medium sm:col-span-2">Support hours<Input value={values.support_hours} onChange={(e) => set("support_hours", e.target.value)} placeholder="Monday - Saturday, 8:00 AM - 8:00 PM" /></label>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Customer support options</h2>
        <p className="mb-4 text-sm text-muted-foreground">Choose which contact options customers can see.</p>
        <div className="space-y-3">
          {channels.map(({ key, title, description, icon: Icon }) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 rounded-xl border p-3">
              <Icon className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{description}</span></span>
              <input type="checkbox" className="size-5 accent-primary" checked={values[key]} onChange={(e) => set(key, e.target.checked)} />
            </label>
          ))}
        </div>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border p-3">
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium">Floating support button</span><span className="block text-xs text-muted-foreground">Show the support shortcut across customer pages.</span></span>
          <input type="checkbox" className="size-5 accent-primary" checked={values.floating_button_enabled} onChange={(e) => set("floating_button_enabled", e.target.checked)} />
        </label>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Last saved: {new Date(data.updated_at).toLocaleString("en-NG")}</p>
        <Button type="submit" disabled={busy}><Save className="mr-2 size-4" />{busy ? "Saving..." : "Save support settings"}</Button>
      </div>
    </form>
  );
}
