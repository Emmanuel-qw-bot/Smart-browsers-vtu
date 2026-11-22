import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Share2, Users, Gift, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function CustomerReferrals() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data, error } = await supabase.from("profiles").select("invite_code").eq("id", auth.user.id).maybeSingle();
      if (error) toast.error("Couldn't load your invitation code.");
      if (data?.invite_code) setCode(data.invite_code);
      setLoading(false);
    })();
  }, []);
  const inviteUrl = code ? `${window.location.origin}/signup?ref=${encodeURIComponent(code)}` : "";
  const copy = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); toast.success(label); }
    catch { toast.error("Copy failed. Please select and copy manually."); }
  };
  const share = async () => {
    const message = `Join Smart Browsers and use my invitation code ${code} when you register: ${inviteUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Join Smart Browsers", text: message, url: inviteUrl }); } catch {}
    } else await copy(message, "Invite message copied");
  };
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-soft">
      <div className="flex items-center gap-2 text-sm opacity-90"><Users className="size-4" /> Invite friends</div>
      <h2 className="mt-2 font-display text-2xl font-bold">Share Smart Browsers. Earn 5 GB.</h2>
      <p className="mt-2 text-sm opacity-90">Invite 5 friends. When each friend funds their wallet with at least ₦500, you qualify for a 5 GB data reward.</p>
      <div className="mt-5 rounded-2xl bg-white/15 p-4">
        <p className="text-xs opacity-80">Your personal invitation code</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-display text-2xl font-bold tracking-widest">{loading ? "Loading…" : code || "Unavailable"}</span>
          <button disabled={!code} onClick={() => copy(code, "Invitation code copied")} className="rounded-xl bg-white/20 p-2 disabled:opacity-50" aria-label="Copy invitation code"><Copy className="size-5"/></button>
        </div>
      </div>
      <button onClick={share} disabled={!code} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-foreground px-4 py-3 font-semibold text-primary disabled:opacity-50"><Share2 className="size-4"/> Share invite</button>
      {inviteUrl && <button onClick={() => copy(inviteUrl, "Invitation link copied")} className="mt-2 w-full rounded-xl border border-white/30 px-4 py-2.5 text-sm">Copy invitation link</button>}
    </section>
    <section className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><Gift className="size-5"/></span><div><h3 className="font-semibold">Reward requirements</h3><p className="text-sm text-muted-foreground">Complete all steps to qualify</p></div></div>
      <div className="mt-4 space-y-3">
        {[ "Invite 5 friends using your code", "Each invited friend funds their wallet with ₦500 or more", "Receive your 5 GB referral reward once eligibility is confirmed" ].map((step, i) => <div key={step} className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary/70"/><span>{step}</span></div>)}
      </div>
      <p className="mt-4 rounded-xl bg-muted p-3 text-xs text-muted-foreground">Referral tracking and automatic reward fulfilment are not active yet. This page currently displays your code and lets you share it; progress/rewards will show once the referral backend is enabled.</p>
    </section>
  </div>;
}
