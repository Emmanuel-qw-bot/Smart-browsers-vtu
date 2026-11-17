import { useEffect, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Gift, Users, Zap } from "lucide-react";
import { getWeekendGiveawaySettings } from "@/lib/weekend-giveaway.functions";

export const customerWeekendRushQuery = queryOptions({
  queryKey: ["customer", "weekend-giveaway"],
  queryFn: () => getWeekendGiveawaySettings(),
});

function countdown(target: string | null, now: number) {
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return "00d 00h 00m 00s";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(days).padStart(2,"0")}d ${String(hours).padStart(2,"0")}h ${String(minutes).padStart(2,"0")}m ${String(seconds).padStart(2,"0")}s`;
}

export function CustomerWeekendRush() {
  const { data } = useSuspenseQuery(customerWeekendRushQuery);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const opens = data.opens_at ? new Date(data.opens_at).getTime() : null;
  const closes = data.closes_at ? new Date(data.closes_at).getTime() : null;
  const open = data.enabled && (!opens || now >= opens) && (!closes || now <= closes);
  const nextTarget = opens && now < opens ? data.opens_at : data.closes_at;
  const label = opens && now < opens ? "Applications open in" : "Applications close in";

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 text-white shadow-soft">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/80"><Zap className="size-4" /> SMART BROWSERS WEEKEND RUSH</div>
        <h2 className="mt-3 font-display text-3xl font-bold">Your weekend could come with free data!</h2>
        <p className="mt-2 max-w-xl text-sm text-white/85">{data.announcement}</p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/15 p-3 text-center"><Gift className="mx-auto mb-1 size-5" /><strong className="block text-xl">{data.reward_data_mb >= 1024 ? `${data.reward_data_mb / 1024} GB` : `${data.reward_data_mb} MB`}</strong><span className="text-[11px] text-white/75">Free data</span></div>
          <div className="rounded-2xl bg-white/15 p-3 text-center"><Users className="mx-auto mb-1 size-5" /><strong className="block text-xl">{data.maximum_winners}</strong><span className="text-[11px] text-white/75">Winners</span></div>
          <div className="rounded-2xl bg-white/15 p-3 text-center"><Zap className="mx-auto mb-1 size-5" /><strong className="block text-xl">{data.minimum_data_purchases}+</strong><span className="text-[11px] text-white/75">Data purchases</span></div>
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2"><Clock className="size-5 text-primary" /><h3 className="font-display text-lg font-semibold">Giveaway status</h3></div>
        {!data.enabled ? <p className="mt-3 rounded-xl bg-muted p-4 text-sm text-muted-foreground">Weekend Rush is not open yet. Check back for the next announcement.</p> : (
          <>
            <p className="mt-3 rounded-xl bg-muted p-4 text-sm font-medium">{open ? "Applications are currently open." : opens && now < opens ? "Applications have not opened yet." : "The application window is closed."}</p>
            {nextTarget && <div className="mt-4"><p className="mb-2 text-xs text-muted-foreground">{label}</p><p className="font-mono text-2xl font-bold tracking-wide">{countdown(nextTarget, now)}</p></div>}
          </>
        )}
        <p className="mt-4 text-sm text-muted-foreground">To qualify, you need at least {data.minimum_data_purchases} successful data-only purchases. Winners are limited to {data.maximum_winners} per weekend.</p>
        <p className="mt-3 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">Applications and automatic eligibility checks will be enabled when the verified data-purchase history is connected. No entries or rewards are being issued from this page yet.</p>
      </section>
    </div>
  );
}
