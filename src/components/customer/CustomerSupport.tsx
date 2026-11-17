import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Mail, MessageCircle, Phone, Users, Clock, Headphones } from "lucide-react";
import { getSupportSettings } from "@/lib/support.functions";

export const customerSupportQuery = queryOptions({
  queryKey: ["customer", "support-settings"],
  queryFn: () => getSupportSettings(),
});

function digits(value: string) {
  return value.replace(/[^0-9]/g, "").replace(/^0/, "234");
}

export function CustomerSupport() {
  const { data } = useSuspenseQuery(customerSupportQuery);
  const phone = digits(data.phone);
  const whatsapp = digits(data.whatsapp_number);
  const channels = [
    data.phone_enabled && phone ? { label: "Call our support team", detail: data.phone, href: `tel:${data.phone.replace(/\s/g, "")}`, Icon: Phone } : null,
    data.whatsapp_enabled && whatsapp ? { label: "Chat with admin on WhatsApp", detail: "Get help directly from our support team", href: `https://wa.me/${whatsapp}`, Icon: MessageCircle } : null,
    data.email_enabled && data.support_email ? { label: "Email support", detail: data.support_email, href: `mailto:${data.support_email}`, Icon: Mail } : null,
    data.group_enabled && data.whatsapp_group_url ? { label: "Join our WhatsApp group", detail: "Connect with the Smart Browsers community", href: data.whatsapp_group_url, Icon: Users } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground"><Headphones className="size-6" /></span><div><h2 className="font-display text-xl font-semibold">We're here to help</h2><p className="text-sm text-muted-foreground">Choose how you'd like to contact Smart Browsers.</p></div></div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm"><Clock className="size-4 shrink-0 text-primary" /><span>Support hours: <strong>{data.support_hours}</strong></span></div>
      </section>
      {channels.length ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {channels.map(({ label, detail, href, Icon }) => (
            <a key={label} href={href} target={href.startsWith("https://") ? "_blank" : undefined} rel={href.startsWith("https://") ? "noreferrer" : undefined} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft transition hover:border-primary/50 active:scale-[.99]">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Icon className="size-5" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-sm">{label}</strong><span className="block break-all text-xs text-muted-foreground">{detail}</span></span>
            </a>
          ))}
        </section>
      ) : (
        <div className="rounded-2xl border bg-card p-6 text-center"><Headphones className="mx-auto mb-2 size-8 text-muted-foreground" /><h3 className="font-semibold">Support contacts coming soon</h3><p className="mt-1 text-sm text-muted-foreground">Our support team has not published contact options yet.</p></div>
      )}
    </div>
  );
}
