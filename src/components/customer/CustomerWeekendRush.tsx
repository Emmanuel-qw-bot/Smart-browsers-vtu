import { useEffect, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Clock, Gift, Users, Zap, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { claimWeekendRushSlot, getWeekendRushSlots, getWeekendRushEligibility, saveWeekendRushRecipient, deliverWeekendRushReward } from "@/lib/weekend-rush-claim.functions";
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
  const deliverReward=useServerFn(deliverWeekendRushReward);
  const [busy, setBusy] = useState(false);
  const [claimedSlot, setClaimedSlot] = useState<number | null>(null);
  const [network, setNetwork] = useState<"MTN"|"Airtel"|"Glo">("MTN");
  const [phone, setPhone] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [successReward,setSuccessReward]=useState<any>(null);
  const [deliveryStatus,setDeliveryStatus]=useState<string|null>(null);
  const savedClaim=eligibilityQuery.data?.claim;
  const activeClaimSlot=claimedSlot??savedClaim?.slot_number??null;
  useEffect(()=>{if(savedClaim?.network)setNetwork(savedClaim.network as "MTN"|"Airtel"|"Glo");if(savedClaim?.recipient_phone)setPhone(savedClaim.recipient_phone);if(savedClaim?.status==="details_confirmed"||savedClaim?.status==="fulfilment_pending"||savedClaim?.status==="fulfilled"||savedClaim?.status==="manual_review"||savedClaim?.status==="failed")setConfirmed(true);if(savedClaim?.status)setDeliveryStatus(savedClaim.status);if(savedClaim?.status==="fulfilled")setSuccessReward({network:savedClaim.network,phone:savedClaim.recipient_phone,claimId:savedClaim.id,username:eligibilityQuery.data?.username,gb:(eligibilityQuery.data?.reward_data_mb??1024)/1024});},[savedClaim]);
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
  async function confirmReward() { setBusy(true); try { const saved:any=await saveRecipient({ data: { network, phone } }); const result=await deliverReward({data:{claimId:saved?.claim_id}}); setDeliveryStatus(result.status); if(result.status==="fulfilled"){setSuccessReward({network:result.network,phone:result.phone,claimId:result.claimId,username:eligibilityQuery.data?.username,gb:(eligibilityQuery.data?.reward_data_mb??1024)/1024});toast.success("Reward delivery confirmed.");}else toast.warning(result.message); await client.invalidateQueries({queryKey:["customer","weekend-rush-eligibility"]});setConfirmed(true); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not deliver reward."); await client.invalidateQueries({queryKey:["customer","weekend-rush-eligibility"]}); } finally { setBusy(false); } }

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
            <label className="block space-y-1 text-sm font-medium">Network<select className="w-full rounded-xl border bg-background p-3" value={network} onChange={e => setNetwork(e.target.value as "MTN"|"Airtel"|"Glo")}><option disabled={!data.mtn_network_id||!data.mtn_data_plan_id}>MTN{!data.mtn_network_id||!data.mtn_data_plan_id?" (not configured)":""}</option><option disabled={!data.airtel_network_id||!data.airtel_data_plan_id}>Airtel{!data.airtel_network_id||!data.airtel_data_plan_id?" (not configured)":""}</option><option disabled={!data.glo_network_id||!data.glo_data_plan_id}>Glo{!data.glo_network_id||!data.glo_data_plan_id?" (not configured)":""}</option></select></label>
            <label className="block space-y-1 text-sm font-medium">Phone number<Input inputMode="tel" placeholder="08012345678" value={phone} onChange={e => setPhone(e.target.value)} /></label>
            <p className="text-xs text-destructive">Please confirm the phone number carefully. Smart Browsers will not be responsible for rewards sent to an incorrect number.</p>
            <Button className="w-full" onClick={() => setConfirmed(true)} disabled={!/^(0[789][01][0-9]{8}|234[789][01][0-9]{8})$/.test(phone)}>Continue to confirmation</Button>
          </div>}
          {activeClaimSlot && confirmed && !successReward && <div className="space-y-3 rounded-2xl border bg-card p-4"><h3 className="font-display text-xl font-bold">Confirm your reward</h3><p className="text-sm">Network: <strong>{network}</strong></p><p className="text-sm">Phone number: <strong>{phone}</strong></p><p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">Please double-check the phone number. Rewards sent to a wrong number may not be recoverable. Smart Browsers cannot guarantee recovery.</p>{deliveryStatus==="fulfilment_pending"&&<p className="text-sm text-amber-700">Your reward is being processed. Do not press again.</p>}{deliveryStatus==="manual_review"&&<p className="text-sm text-destructive">Delivery needs support review. Do not retry.</p>}{deliveryStatus==="failed"&&<p className="text-sm text-destructive">The provider confirmed a failure. Your claim is retained. Contact support before trying again.</p>}<Button className="w-full" disabled={busy||deliveryStatus==="fulfilment_pending"||deliveryStatus==="manual_review"||deliveryStatus==="fulfilled"} onClick={confirmReward}>{busy ? "Sending reward..." : (deliveryStatus==="failed"?"Retry reward delivery":"Claim "+(data.reward_data_mb>=1024?(data.reward_data_mb/1024)+"GB":data.reward_data_mb+"MB")+" free data")}</Button><p className="text-xs text-muted-foreground">No wallet debit will occur. A claim reference will be saved to protect against duplicate sends.</p></div>}
        </div>
        <p className="mt-3 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">Qualification, slot claiming, network mappings and guarded provider delivery are connected. Reward delivery is free and does not debit the wallet. Uncertain provider responses are locked for support review.</p>
      </section>
      {successReward&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div role="dialog" aria-modal="true" className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 text-center shadow-2xl"><div className="pointer-events-none absolute inset-x-0 top-0 flex justify-around text-2xl opacity-80"><span>🎉</span><span>✨</span><span>🎊</span><span>🌟</span><span>🎉</span></div><div className="mx-auto mt-5 grid size-20 place-items-center rounded-full bg-emerald-100 text-4xl dark:bg-emerald-900/30">🎁</div><h2 className="mt-3 font-display text-2xl font-bold text-primary">Congratulations{successReward.username?", @"+successReward.username:""}!</h2><p className="mt-2">You have been rewarded <strong>{successReward.gb}GB free data</strong> for Weekend Rush.</p><p className="mt-1 text-sm text-muted-foreground">Network: {successReward.network} · {successReward.phone}</p><p className="mt-3 text-xs text-muted-foreground">Please check your phone. Claim reference: {successReward.claimId}</p><Button className="mt-5 w-full" onClick={()=>setSuccessReward(null)}>Awesome!</Button></div></div>}

    </div>
  );
}
