import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Medal, Crown, Star, Trophy } from "lucide-react";

const tiers = [
  { name: "Regular Customer", threshold: 50, reward: "3 GB", icon: Award, color: "border-sky-300 bg-sky-50 text-sky-800" },
  { name: "Bronze Customer", threshold: 100, reward: "5 GB", icon: Medal, color: "border-orange-300 bg-orange-50 text-orange-800" },
  { name: "Silver Customer", threshold: 500, reward: "10 GB", icon: Star, color: "border-slate-300 bg-slate-50 text-slate-700" },
  { name: "Gold Customer", threshold: 1000, reward: "20 GB", icon: Trophy, color: "border-amber-300 bg-amber-50 text-amber-800" },
  { name: "VIP Customer", threshold: 2000, reward: "30 GB", icon: Crown, color: "border-violet-300 bg-violet-50 text-violet-800" },
];

export function CustomerBadges() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-purchase-badges"],
    queryFn: async () => {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error("Please sign in to view your badges.");
      const { data: purchases, error: txError } = await supabase
        .from("wallet_transactions")
        .select("reference, description, created_at")
        .eq("user_id", userData.user.id)
        .eq("category", "purchase")
        .order("created_at", { ascending: true });
      if (txError) throw txError;
      const { data: refunds, error: refundError } = await supabase
        .from("wallet_transactions")
        .select("reference")
        .eq("user_id", userData.user.id)
        .eq("category", "refund");
      if (refundError) throw refundError;
      const refundedReferences = new Set((refunds ?? []).map((r) => r.reference.replace(/^refund:/, "")));
      // Badge milestones currently track data purchases only; exclude entries that have been refunded.
      return (purchases ?? []).filter((p) =>
        p.description.startsWith("Data:") && !refundedReferences.has(p.reference)
      ).length;
    },
    staleTime: 30_000,
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  if (error) return <div className="rounded-2xl bg-card p-5 text-sm text-destructive">Couldn't load your badge progress. Please refresh.</div>;
  const count = data ?? 0;
  const current = [...tiers].reverse().find((tier) => count >= tier.threshold);
  const next = tiers.find((tier) => count < tier.threshold);
  const progress = next ? Math.min(100, (count / next.threshold) * 100) : 100;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-soft">
        <p className="text-sm opacity-80">Lifetime data purchases</p>
        <p className="mt-1 font-display text-4xl font-bold">{count.toLocaleString("en-NG")}</p>
        <p className="mt-2 text-sm opacity-85">{current ? `Current badge: ${current.name}` : "Your first badge is waiting for you!"}</p>
        {next && <div className="mt-4">
          <div className="flex justify-between text-xs font-medium"><span>Progress to {next.name}</span><span>{count} / {next.threshold}</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-2 text-xs opacity-80">{Math.max(0, next.threshold - count)} more eligible purchases to unlock {next.reward} reward milestone.</p>
        </div>}
        {!next && <p className="mt-3 text-sm">You've reached the highest badge tier. Thank you for being a VIP!</p>}
      </section>
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Customer badge milestones</h2>
        {tiers.map((tier) => {
          const Icon = tier.icon;
          const unlocked = count >= tier.threshold;
          const pct = Math.min(100, (count / tier.threshold) * 100);
          return <article key={tier.name} className={`rounded-2xl border p-4 ${unlocked ? tier.color : "bg-card"}`}>
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-background/70"><Icon className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1"><h3 className="font-semibold">{tier.name}</h3><span className="text-xs font-semibold">{unlocked ? "Unlocked" : `${count} / ${tier.threshold}`}</span></div>
                <p className="text-sm opacity-80">{tier.threshold.toLocaleString()} purchases · {tier.reward} reward</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
          </article>;
        })}
      </div>
      <p className="rounded-2xl border border-dashed p-4 text-xs text-muted-foreground">Badge progress counts recorded data-purchase wallet entries that have not been refunded. Reward data will be credited after the reward-fulfilment system is securely connected and verified.</p>
    </div>
  );
}
