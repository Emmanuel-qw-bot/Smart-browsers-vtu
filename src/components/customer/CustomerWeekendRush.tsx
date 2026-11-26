import { useEffect, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Gift, Users, Zap, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { claimWeekendRushSlot, getWeekendRushSlots, getWeekendRushEligibility, saveWeekendRushRecipient } from "@/lib/weekend-rush-claim.functions";
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
  const client = useQueryClient();
  const slotsQuery = useQuery({ queryKey: ["customer", "weekend-rush-slots"], queryFn: () => getWeekendRushSlots(), enabled: data.enabled, refetchInterval: 15000 });
  const eligibilityQuery=useQuery({queryKey:["customer","weekend-rush-eligibility"],queryFn:()=>getWeekendRushEligibility(),refetchInterval:15000});
  const claim = useServerFn(claimWeekendRushSlot);
  const saveRecipient = useServerFn(saveWeekendRushRecipient);
  const [busy, setBusy] = useState(false);
  const [claimedSlot, setClaimedSlot] = useState<number | null>(null);
  const [network, setNetwork] = useState<"MTN"|"Airtel"|"Glo">("MTN");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const savedClaim=eligibilityQuery.data?.claim;
  const activeClaimSlot=claimedSlot??savedClaim?.slot_number??null;
  useEffect(()=>{if(savedClaim?.network)setNetwork(savedClaim.network as "MTN"|"Airtel"|"Glo");if(savedClaim?.recipient_phone)setPhone(savedClaim.recipient_phone);if(savedClaim?.status==="details_confirmed"||savedClaim?.status==="fulfilment_pending"||savedClaim?.status==="fulfilled")setConfirmed(true);},[savedClaim]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const opens = data.opens_at ? new Date(data.opens_at).getTime() : null;
  const closes = data.closes_at ? new Date(data.closes_at).getTime() : null;
  const open = data.enabled && (!opens || now >= opens) && (!closes || now <= closes);
  const nextTarget = opens && now < opens ? data.opens_at : data.closes_at;
  const label = opens && now < opens ? "Applications open in" : "Applications close in";
  async function apply() { setBusy(true); try { const result = await claim(); setClaimedSlot(result.slot_number); await Promise.all([client.invalidateQueries({ queryKey: ["customer", "weekend-rush-slots"] }),client.invalidateQueries({queryKey:["customer","weekend-rush-eligibility"]})]); toast.success("Congratulations! You have secured a Weekend Rush slot."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not claim a slot."); } finally { setBusy(false); } }
  async function confirmReward() { setBusy(true); try { await saveRecipient({ data: { network, phone } }); await client.invalidateQueries({queryKey:["customer","weekend-rush-eligibility"]}); setConfirmed(true); toast.success("Reward details saved. Delivery is the next step."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save recipient details."); } finally { setBusy(false); } }

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
        <div className="mt-5 space-y-3">
          <h3 className="font-display text-lg font-semibold">Available reward slots</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: data.maximum_winners }, (_, i) => {
              const slot = slotsQuery.data?.find(item => item.slot_number === i + 1);
              const taken = slot?.status === "claimed";
              return <div key={i + 1} className={"flex items-center justify-between rounded-xl border p-3 " + (taken ? "bg-muted text-muted-foreground" : "bg-card")}><strong>Slot {i + 1}</strong>{taken ? <span className="flex items-center gap-1 text-xs"><CheckCircle2 className="size-4" /> Claimed</span> : <span className="flex items-center gap-1 text-xs text-primary"><Circle className="size-4" /> Available</span>}</div>;
            })}
          </div>
          {eligibilityQuery.data&&<div className="rounded-xl border bg-muted/50 p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>Your eligibility</strong><span className={eligibilityQuery.data.eligible?"text-emerald-600":"text-muted-foreground"}>{eligibilityQuery.data.eligible?"Qualified":"Not yet qualified"}</span></div><p className="mt-1">Successful data purchases: <strong>{eligibilityQuery.data.successful_data_purchases}/{eligibilityQuery.data.minimum_data_purchases}</strong></p>{!eligibilityQuery.data.eligible&&<p className="mt-1 text-xs text-muted-foreground">You need {Math.max(0,eligibilityQuery.data.minimum_data_purchases-eligibilityQuery.data.successful_data_purchases)} more successful data purchase(s). Only provider-confirmed successful data purchases count. Airtime, failed, pending and refunded purchases do not count.</p>}</div>}
          {open && eligibilityQuery.data?.eligible && !activeClaimSlot && <Button className="w-full" onClick={apply} disabled={busy || slotsQuery.isLoading || eligibilityQuery.isLoading}>{busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}APPLY NOW</Button>}
          {activeClaimSlot && !confirmed && <div className="space-y-3 rounded-2xl border border-primary/30 bg-card p-4">
            <div className="text-center"><Gift className="mx-auto size-8 text-primary" /><h3 className="mt-2 font-display text-xl font-bold">Congratulations!</h3><p className="text-sm text-muted-foreground">You secured Slot {activeClaimSlot}. Claim your free data reward.</p></div>
            <label className="block space-y-1 text-sm font-medium">Network<select className="w-full rounded-xl border bg-background p-3" value={network} onChange={e => setNetwork(e.target.value as "MTN"|"Airtel"|"Glo")}><option>MTN</option><option>Airtel</option><option>Glo</option></select></label>
            <label className="block space-y-1 text-sm font-medium">Phone number<Input inputMode="tel" placeholder="08012345678" value={phone} onChange={e => setPhone(e.target.value)} /></label>
            <p className="text-xs text-destructive">Please confirm the phone number carefully. Smart Browsers will not be responsible for rewards sent to an incorrect number.</p>
            <Button className="w-full" onClick={() => setConfirmed(true)} disabled={!/^(0[789][01][0-9]{8}|234[789][01][0-9]{8})$/.test(phone)}>Continue to confirmation</Button>
          </div>}
          {activeClaimSlot && confirmed && <div className="space-y-3 rounded-2xl border bg-card p-4"><h3 className="font-display text-xl font-bold">Confirm your reward</h3><p className="text-sm">Network: <strong>{network}</strong></p><p className="text-sm">Phone number: <strong>{phone}</strong></p><p className="text-xs text-muted-foreground">This is a free reward. Your wallet will not be charged. Your claim details have been saved. Data delivery is the next integration step.</p><Button className="w-full" disabled={busy} onClick={confirmReward}>{busy ? "Saving..." : "Confirm reward details"}</Button></div>}
        </div>
        <p className="mt-3 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">Qualification and slot claiming are now connected to provider-confirmed successful data purchase records. Free data delivery will only be enabled after reward plan mappings and provider-safe fulfillment checks are configured.</p>
      </section>
    </div>
  );
}
