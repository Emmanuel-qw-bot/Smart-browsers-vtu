import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Headphones, Phone, MessageCircle, Mail, Users, X } from "lucide-react";
import { getSupportSettings } from "@/lib/support.functions";

function phoneDigits(value: string) {
  return value.replace(/\D/g, "").replace(/^0/, "234");
}

export function FloatingSupportButton() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["customer", "support-settings"],
    queryFn: () => getSupportSettings(),
    staleTime: 60_000,
    retry: 1,
  });

  if (!data || !data.floating_button_enabled) return null;

  const whatsapp = phoneDigits(data.whatsapp_number);
  const links = [
    data.phone_enabled && data.phone ? { label: "Call support", detail: data.phone, href: `tel:${data.phone.replace(/\s/g, "")}`, Icon: Phone } : null,
    data.whatsapp_enabled && whatsapp ? { label: "WhatsApp chat", detail: "Message our support team", href: `https://wa.me/${whatsapp}`, Icon: MessageCircle } : null,
    data.email_enabled && data.support_email ? { label: "Email support", detail: data.support_email, href: `mailto:${data.support_email}`, Icon: Mail } : null,
    data.group_enabled && data.whatsapp_group_url ? { label: "WhatsApp group", detail: "Join the community", href: data.whatsapp_group_url, Icon: Users } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!links.length) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3 lg:bottom-6">
      {open && (
        <div className="w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <div><p className="font-display font-semibold">Need help?</p><p className="text-xs text-muted-foreground">{data.support_hours}</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support options" className="grid size-8 place-items-center rounded-full bg-muted"><X className="size-4" /></button>
          </div>
          <div className="space-y-1">
            {links.map(({ label, detail, href, Icon }) => (
              <a key={label} href={href} target={href.startsWith("https://") ? "_blank" : undefined} rel={href.startsWith("https://") ? "noreferrer" : undefined} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-muted">
                <span className="grid size-9 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Icon className="size-4" /></span>
                <span className="min-w-0"><strong className="block text-sm">{label}</strong><span className="block truncate text-xs text-muted-foreground">{detail}</span></span>
              </a>
            ))}
          </div>
        </div>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close support" : "Open support"} className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background/80 transition hover:scale-105 active:scale-95">
        {open ? <X className="size-6" /> : <Headphones className="size-6" />}
      </button>
    </div>
  );
}
