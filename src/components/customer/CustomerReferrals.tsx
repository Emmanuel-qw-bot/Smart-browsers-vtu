import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, CheckCircle2, Clock3, LockKeyhole, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyReferralDashboard, getReferralRewardProducts, claimReferralDataReward } from "@/lib/referral.functions";

const networks = ["MTN","Airtel","Glo"] as const;
const naira = (k:number) => "₦"+(k/100).toLocaleString("en-NG");

export function CustomerReferrals() {
  const qc=useQueryClient();
  const dash=useQuery({queryKey:["my-referral-dashboard"],queryFn:()=>getMyReferralDashboard()});
  const plans=useQuery({queryKey:["referral-reward-plans"],queryFn:()=>getReferralRewardProducts()});
  const claim=useServerFn(claimReferralDataReward);
  const [network,setNetwork]=useState<(typeof networks)[number]>("MTN");
  const [phone,setPhone]=useState("");
  const [successReward,setSuccessReward]=useState<any>(null);
  const [confirmClaim,setConfirmClaim]=useState(false);
  const [busy,setBusy]=useState(false);
  const d:any=dash.data;
  const mappingList:any[]=plans.data??[];
  const configured=mappingList.find(m=>m.network===network)?.configured===true;
  useEffect(()=>{if(mappingList.length&&!mappingList.find(m=>m.network===network)?.configured){const first=mappingList.find(m=>m.configured)?.network;if(first)setNetwork(first as any);}},[mappingList,network]);
  const count=d?.available_count??0;
  const required=d?.required??5;
  const progress=Math.min(100,Math.round((count/required)*100));

  async function submit(){
    if(!configured){toast.error("This reward network is not configured. Choose another network or contact support.");return;}
    if(!/^0[789][01]\d{8}$/.test(phone)){toast.error("Enter a valid 11-digit Nigerian phone number.");return;}
    setConfirmClaim(true);
  }
  async function sendReward(){
    setBusy(true);
    try{
      const result=await claim({data:{network,phone}});
      if(result.status==="delivered")setSuccessReward({network,phone,gb:d.reward_data_mb/1000,claimId:result.claimId});
      else toast.warning(result.message);
      setConfirmClaim(false);
      await qc.invalidateQueries({queryKey:["my-referral-dashboard"]});
    }catch(e){toast.error(e instanceof Error?e.message:"Reward claim failed");setConfirmClaim(false);await qc.invalidateQueries({queryKey:["my-referral-dashboard"]});}
    finally{setBusy(false);}
  }

  if(dash.isLoading)return <div className="h-44 animate-pulse rounded-2xl bg-muted"/>;
  if(dash.error)return <div className="rounded-xl border p-4 text-sm text-destructive">Could not load referral rewards. Please refresh.</div>;
  if(!d?.enabled)return <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">Referral rewards are temporarily paused.</div>;

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-700 via-indigo-700 to-emerald-800 p-5 text-white shadow-lg shadow-violet-900/15">
      <div className="flex items-center gap-2"><span className="rounded-xl bg-white/15 p-2"><Gift className="size-5"/></span><h2 className="font-display text-xl font-bold">Invite {required} friends. Earn {d.reward_data_mb/1000}GB!</h2></div>
      <p className="mt-2 text-sm opacity-90">Each friend must sign up with your invitation code and successfully fund their wallet with at least {naira(d.minimum_funding_kobo)}. Welcome bonuses and promotional credits don't count.</p>
      <div className="mt-4 flex justify-between text-sm font-semibold"><span>Referrals toward next reward</span><span>{count}/{required}</span></div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 via-yellow-200 to-white transition-all" style={{width:progress+"%"}}/></div>
      <p className="mt-2 text-xs opacity-80">{d.available_count??count} qualifying friend(s) available for your next reward claim.</p>
    </section>

    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm dark:from-violet-950/20 dark:to-card">
      <h3 className="flex items-center gap-2 font-display font-semibold"><span className="rounded-lg bg-violet-100 p-1.5 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"><Gift className="size-4"/></span>Your referrals</h3>
      {(d.friends??[]).length===0?<p className="mt-3 text-sm text-muted-foreground">No referrals yet. Share your invitation code from My Account to get started.</p>:
        <div className="mt-3 space-y-2">{d.friends.map((f:any,i:number)=><div key={i} className="flex items-center justify-between rounded-xl border border-violet-100 bg-white/80 p-3 shadow-sm dark:border-violet-900/40 dark:bg-card">
          <div><p className="text-sm font-medium">{f.display_name}</p><p className="text-xs text-muted-foreground">Joined {new Date(f.joined_at).toLocaleDateString()}</p></div>
          {f.qualified?<span className="flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="size-4"/>Qualified</span>:<span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-4"/>Funding pending</span>}
        </div>)}</div>}
    </section>

    <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-white p-4 shadow-sm dark:from-amber-950/20 dark:via-orange-950/10 dark:to-card">
      <h3 className="flex items-center gap-2 font-display font-semibold"><span className="rounded-lg bg-amber-100 p-1.5 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"><Gift className="size-4"/></span>Your reward</h3>
      {!d.unlocked?<div className="mt-3 rounded-xl border border-amber-200 bg-white/70 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-card dark:text-amber-200"><LockKeyhole className="size-4"/>Complete {Math.max(0,required-(d.available_count??count))} more qualifying referral(s) to unlock your reward.</div>:
        <div className="mt-3 space-y-3 rounded-xl border border-amber-200/80 bg-white/70 p-3 dark:border-amber-900/40 dark:bg-card/80">
          <p className="text-sm font-semibold text-primary">🎉 Your {d.reward_data_mb/1000}GB reward is unlocked! Choose the network and phone number to receive it.</p>
          <label className="block text-sm">Network<select className="mt-1 w-full rounded-xl border border-violet-200 bg-white p-3 focus:border-violet-500 focus:outline-none dark:border-violet-900/50 dark:bg-background" value={network} onChange={e=>setNetwork(e.target.value as any)}>{networks.map(n=><option key={n} disabled={!mappingList.find(m=>m.network===n)?.configured}>{n}{!mappingList.find(m=>m.network===n)?.configured?" (not configured)":""}</option>)}</select></label>
          <label className="block text-sm">Recipient phone number<input inputMode="numeric" className="mt-1 w-full rounded-xl border border-violet-200 bg-white p-3 focus:border-violet-500 focus:outline-none dark:border-violet-900/50 dark:bg-background" placeholder="08012345678" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,11))}/></label>
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">Check the phone number carefully. If you claim the reward for a wrong number, it may not be recoverable.</p>
          {!confirmClaim?<button disabled={busy||!configured||plans.isLoading} onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 to-indigo-700 px-4 py-3 font-semibold text-white shadow-md shadow-violet-900/15 transition hover:brightness-110 disabled:opacity-50">{busy?<Loader2 className="size-4 animate-spin"/>:"Continue"}</button>:<div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"><h4 className="font-semibold">Confirm reward details</h4><p className="text-sm">Reward: {d.reward_data_mb/1000}GB · Network: {network} · Phone: {phone}</p><p className="text-xs">Please double-check the recipient number. Data sent to a wrong number may not be recoverable. This claim will use your qualifying referrals and will not charge your wallet.</p><button disabled={busy} onClick={sendReward} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy?<Loader2 className="size-4 animate-spin"/>:"Claim "+(d.reward_data_mb/1000)+"GB reward"}</button><button disabled={busy} onClick={()=>setConfirmClaim(false)} className="w-full rounded-xl border px-4 py-2 text-sm">Go back and edit</button></div>}
          <p className="text-xs text-muted-foreground">The reward is free; your wallet will not be charged. If delivery is pending or uncertain, do not retry until it is reconciled.</p>
        </div>}
    </section>


    {successReward&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"><div role="dialog" aria-modal="true" className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 text-center shadow-2xl"><div className="pointer-events-none absolute inset-x-0 top-0 flex justify-around text-2xl opacity-80"><span>🎉</span><span>✨</span><span>🎊</span><span>🌟</span><span>🎉</span></div><div className="mx-auto mt-5 grid size-20 place-items-center rounded-full bg-emerald-100 text-4xl dark:bg-emerald-900/30">🎁</div><h2 className="mt-3 font-display text-2xl font-bold text-primary">Congratulations!</h2><p className="mt-2">Your <strong>{successReward.gb}GB referral reward</strong> has been sent successfully to {successReward.network}.</p><p className="mt-1 text-sm text-muted-foreground">Recipient: {successReward.phone}</p><p className="mt-3 text-xs text-muted-foreground">Please check the recipient phone. Claim reference: {successReward.claimId}</p><button onClick={()=>setSuccessReward(null)} className="mt-5 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground">Awesome!</button></div></div>}
    {(d.claims??[]).length>0&&<section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm dark:from-indigo-950/20 dark:to-card"><h3 className="font-display font-semibold text-indigo-900 dark:text-indigo-200">Reward history</h3><div className="mt-3 space-y-2">{d.claims.map((c:any)=><div key={c.id} className="rounded-xl border border-indigo-100 bg-white/80 p-3 text-sm shadow-sm dark:border-indigo-900/40 dark:bg-card"><div className="flex justify-between gap-2"><span>{c.data_mb/1000}GB · {c.network}</span><strong className="capitalize">{c.status}</strong></div><p className="text-xs text-muted-foreground">To ••••{c.recipient_phone.slice(-4)} · {new Date(c.created_at).toLocaleString()}</p>{c.failure_reason&&<p className="mt-1 text-xs text-destructive">{c.failure_reason}</p>}{c.status==="failed"&&<button disabled={busy} onClick={async()=>{setBusy(true);try{const result=await claim({data:{retryClaimId:c.id}});toast[result.status==="delivered"?"success":"warning"](result.message);await qc.invalidateQueries({queryKey:["my-referral-dashboard"]});}catch(e){toast.error(e instanceof Error?e.message:"Retry failed");}finally{setBusy(false);}}} className="mt-2 rounded-lg border px-3 py-2 text-xs font-medium">Retry failed delivery</button>}</div>)}</div></section>}
  </div>;
}
