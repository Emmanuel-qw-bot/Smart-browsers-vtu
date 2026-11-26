import { useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Gift, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getWeekendGiveawaySettings, saveWeekendGiveawaySettings } from "@/lib/weekend-giveaway.functions";
import { getAdminWeekendRushClaims, resolveWeekendRushClaim } from "@/lib/weekend-rush-claim.functions";

export const weekendGiveawayQuery = queryOptions({
  queryKey: ["admin", "weekend-giveaway"],
  queryFn: () => getWeekendGiveawaySettings(),
});

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export function WeekendGiveawaySettings() {
  const { data } = useSuspenseQuery(weekendGiveawayQuery);
  const client = useQueryClient();
  const save = useServerFn(saveWeekendGiveawaySettings);
  const claimsQuery=useQuery({queryKey:["admin","weekend-rush-claims"],queryFn:()=>getAdminWeekendRushClaims()});
  const resolveClaim=useServerFn(resolveWeekendRushClaim);
  const [enabled, setEnabled] = useState(data.enabled);
  const [announcement, setAnnouncement] = useState(data.announcement);
  const [reward, setReward] = useState(String(data.reward_data_mb));
  const [minimum, setMinimum] = useState(String(data.minimum_data_purchases));
  const [winners, setWinners] = useState(String(data.maximum_winners));
  const [opens, setOpens] = useState(localDate(data.opens_at));
  const [closes, setCloses] = useState(localDate(data.closes_at));
  const [maps,setMaps]=useState({mtn_network_id:data.mtn_network_id??"",mtn_data_plan_id:data.mtn_data_plan_id??"",airtel_network_id:data.airtel_network_id??"",airtel_data_plan_id:data.airtel_data_plan_id??"",glo_network_id:data.glo_network_id??"",glo_data_plan_id:data.glo_data_plan_id??""});
  const [busy, setBusy] = useState(false);
  const [claimBusy,setClaimBusy]=useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await save({ data: {
        enabled, announcement, reward_data_mb: Number(reward),
        minimum_data_purchases: Number(minimum), maximum_winners: Number(winners),
        opens_at: opens ? new Date(opens).toISOString() : null,
        closes_at: closes ? new Date(closes).toISOString() : null,
        ...maps,
      }});
      await client.invalidateQueries({ queryKey: weekendGiveawayQuery.queryKey });
      toast.success("Weekend Rush settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings.");
    } finally { setBusy(false); }
  }


  async function reconcileClaim(id:string,status:"fulfilled"|"failed"){
    const promptText=status==="fulfilled"?"Only mark delivered after confirming the provider transaction or recipient receipt. Add verification note:":"Confirm that the provider failed and the reward was not delivered. Add note:";
    const note=prompt(promptText);if(note===null)return;
    if(status==="fulfilled"&&!confirm("Have you independently verified that the reward was delivered?"))return;
    setClaimBusy(id);try{await resolveClaim({data:{claimId:id,status,note}});toast.success("Weekend Rush claim reconciled.");await claimsQuery.refetch();}catch(e){toast.error(e instanceof Error?e.message:"Could not reconcile claim.");}finally{setClaimBusy("");}
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-secondary text-secondary-foreground"><Gift className="size-5" /></span><div><h2 className="font-display text-lg font-semibold">Weekend Rush giveaway</h2><p className="text-sm text-muted-foreground">Configure the free weekend data giveaway.</p></div></div>
        <label className="flex items-center justify-between gap-3 rounded-xl border p-3"><span><strong className="block text-sm">Enable Weekend Rush</strong><span className="text-xs text-muted-foreground">Show the current giveaway to customers.</span></span><input type="checkbox" className="size-5 accent-primary" checked={enabled} onChange={e => setEnabled(e.target.checked)} /></label>
        <label className="mt-4 block space-y-1 text-sm font-medium">Customer announcement<textarea className="min-h-24 w-full rounded-xl border bg-background p-3 text-sm" maxLength={500} value={announcement} onChange={e => setAnnouncement(e.target.value)} /></label>
      </section>
      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Giveaway rules</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium">Reward (MB)<Input type="number" min="100" max="10000" value={reward} onChange={e => setReward(e.target.value)} /></label>
          <label className="space-y-1 text-sm font-medium">Minimum successful data purchases<Input type="number" min="1" value={minimum} onChange={e => setMinimum(e.target.value)} /></label>
          <label className="space-y-1 text-sm font-medium">Maximum winners<Input type="number" min="1" max="100" value={winners} onChange={e => setWinners(e.target.value)} /></label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Your agreed starting rules are 1 GB, at least 10 successful data purchases, and 10 winners.</p>
      </section>
      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <h2 className="mb-3 font-display text-lg font-semibold">Reward plan mapping</h2><p className="mb-3 text-xs text-muted-foreground">Enter the Arewabundle network ID and plan ID for each network. These are used only for free reward delivery, not normal purchases. Leave 9mobile unsupported.</p>
        <div className="space-y-3">{(["mtn","airtel","glo"] as const).map((n)=>{const label=n==="mtn"?"MTN":n==="airtel"?"Airtel":"Glo";return <div key={n} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2"><strong className="sm:col-span-2">{label}</strong><label className="text-sm">Network ID<Input value={maps[n+"_network_id"]} onChange={e=>setMaps({...maps,[n+"_network_id"]:e.target.value})} /></label><label className="text-sm">Data plan ID<Input value={maps[n+"_data_plan_id"]} onChange={e=>setMaps({...maps,[n+"_data_plan_id"]:e.target.value})} /></label></div>})}</div>
      </section>
      <section className="rounded-2xl border bg-card p-4 sm:p-6">
        <div className="mb-3 flex items-center gap-2"><Clock className="size-5 text-primary" /><h2 className="font-display text-lg font-semibold">Application schedule</h2></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">Applications open<Input type="datetime-local" value={opens} onChange={e => setOpens(e.target.value)} /></label>
          <label className="space-y-1 text-sm font-medium">Applications close<Input type="datetime-local" value={closes} onChange={e => setCloses(e.target.value)} /></label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Times are saved with your device's timezone conversion. Customers will see the opening and closing schedule.</p>
      </section>

      <section className="rounded-2xl border bg-card p-4 sm:p-6"><h2 className="font-display text-lg font-semibold">Weekend Rush claims and delivery status</h2><p className="mt-1 text-xs text-muted-foreground">Review customer slots. For uncertain deliveries, verify provider history before manually resolving. Never mark delivered based only on the app response.</p>{claimsQuery.isLoading?<div className="mt-3 h-20 animate-pulse rounded-xl bg-muted"/>:claimsQuery.error?<p className="mt-3 text-sm text-destructive">Could not load claims.</p>:!claimsQuery.data?.length?<p className="mt-3 text-sm text-muted-foreground">No Weekend Rush claims yet.</p>:<div className="mt-3 space-y-2">{claimsQuery.data.map((claim:any)=><article key={claim.id} className="rounded-xl border p-3 text-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><strong>Slot {claim.slot?.slot_number??"—"} · @{claim.profile?.username??"customer"}</strong><p className="text-xs text-muted-foreground">{claim.profile?.full_name??claim.user_id} · {claim.network??"Network not set"} · {claim.recipient_phone?("••••"+claim.recipient_phone.slice(-4)):"Phone not set"}</p></div><span className="rounded-full border px-2 py-1 text-xs capitalize">{claim.status.replace(/_/g," ")}</span></div><p className="mt-1 text-xs text-muted-foreground">{new Date(claim.created_at).toLocaleString("en-NG")} · Ref: {claim.provider_reference??claim.id}</p>{claim.admin_resolution_note&&<p className="mt-1 text-xs">Admin note: {claim.admin_resolution_note}</p>}{["manual_review","fulfilment_pending"].includes(claim.status)&&<div className="mt-2 flex flex-wrap gap-2"><button disabled={claimBusy===claim.id} onClick={()=>reconcileClaim(claim.id,"fulfilled")} className="rounded-lg border px-3 py-2 text-xs">Verify delivered</button><button disabled={claimBusy===claim.id} onClick={()=>reconcileClaim(claim.id,"failed")} className="rounded-lg border px-3 py-2 text-xs">Confirm failed</button></div>}</article>)}</div>}</section>
      <div className="flex justify-end"><Button type="submit" disabled={busy}><Save className="mr-2 size-4" />{busy ? "Saving..." : "Save Weekend Rush settings"}</Button></div>
    </form>
  );
}
