import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, CheckCircle2, Clock3, LockKeyhole, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getMyReferralDashboard, getReferralRewardProducts, claimReferralDataReward } from "@/lib/referral.functions";

const networks = ["MTN","Airtel","Glo","9mobile"] as const;
const naira = (k:number) => "₦"+(k/100).toLocaleString("en-NG");

export function CustomerReferrals() {
  const qc=useQueryClient();
  const dash=useQuery({queryKey:["my-referral-dashboard"],queryFn:()=>getMyReferralDashboard()});
  const plans=useQuery({queryKey:["referral-reward-plans"],queryFn:()=>getReferralRewardProducts()});
  const claim=useServerFn(claimReferralDataReward);
  const [network,setNetwork]=useState<(typeof networks)[number]>("MTN");
  const [phone,setPhone]=useState("");
  const [productId,setProductId]=useState("");
  const [busy,setBusy]=useState(false);
  const d:any=dash.data;
  const planList:any[]=plans.data??[];
  const options=planList.filter(p=>p.network_name.toLowerCase()===network.toLowerCase());
  const selected=options.find(p=>p.id===productId)??options[0];
  const count=d?.available_count??0;
  const required=d?.required??5;
  const progress=Math.min(100,Math.round((count/required)*100));

  async function submit(){
    if(!selected){toast.error("No configured 5GB plan is available for this network.");return;}
    if(!/^0[789][01]\d{8}$/.test(phone)){toast.error("Enter a valid 11-digit Nigerian phone number.");return;}
    if(!confirm("Claim your referral data reward?\n\nNetwork: "+network+"\nPhone: "+phone+"\nPlan: "+selected.plan_name+"\nThis will submit a data delivery request."))return;
    setBusy(true);
    try{
      const result=await claim({data:{network,phone,productId:selected.id}});
      toast[result.status==="delivered"?"success":"warning"](result.message);
      await qc.invalidateQueries({queryKey:["my-referral-dashboard"]});
    }catch(e){toast.error(e instanceof Error?e.message:"Reward claim failed");}
    finally{setBusy(false);}
  }

  if(dash.isLoading)return <div className="h-44 animate-pulse rounded-2xl bg-muted"/>;
  if(dash.error)return <div className="rounded-xl border p-4 text-sm text-destructive">Could not load referral rewards. Please refresh.</div>;
  if(!d?.enabled)return <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">Referral rewards are temporarily paused.</div>;

  return <div className="space-y-4">
    <section className="rounded-3xl bg-brand p-5 text-primary-foreground shadow-brand">
      <div className="flex items-center gap-2"><Gift className="size-5"/><h2 className="font-display text-xl font-bold">Invite {required} friends. Earn {d.reward_data_mb/1000}GB!</h2></div>
      <p className="mt-2 text-sm opacity-90">Each friend must sign up with your invitation code and successfully fund their wallet with at least {naira(d.minimum_funding_kobo)}. Welcome bonuses and promotional credits don't count.</p>
      <div className="mt-4 flex justify-between text-sm font-semibold"><span>Referrals toward next reward</span><span>{count}/{required}</span></div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-primary-foreground/20"><div className="h-full rounded-full bg-primary-foreground transition-all" style={{width:progress+"%"}}/></div>
      <p className="mt-2 text-xs opacity-80">{d.available_count??count} qualifying friend(s) available for your next reward claim.</p>
    </section>

    <section className="rounded-2xl border bg-card p-4 shadow-soft">
      <h3 className="font-display font-semibold">Your referrals</h3>
      {(d.friends??[]).length===0?<p className="mt-3 text-sm text-muted-foreground">No referrals yet. Share your invitation code from My Account to get started.</p>:
        <div className="mt-3 space-y-2">{d.friends.map((f:any,i:number)=><div key={i} className="flex items-center justify-between rounded-xl bg-muted p-3">
          <div><p className="text-sm font-medium">{f.display_name}</p><p className="text-xs text-muted-foreground">Joined {new Date(f.joined_at).toLocaleDateString()}</p></div>
          {f.qualified?<span className="flex items-center gap-1 text-xs font-semibold text-primary"><CheckCircle2 className="size-4"/>Qualified</span>:<span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-4"/>Funding pending</span>}
        </div>)}</div>}
    </section>

    <section className="rounded-2xl border bg-card p-4 shadow-soft">
      <h3 className="font-display font-semibold">Your reward</h3>
      {!d.unlocked?<div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><LockKeyhole className="size-4"/>Complete {Math.max(0,required-(d.available_count??count))} more qualifying referral(s) to unlock your reward.</div>:
        <div className="mt-3 space-y-3">
          <p className="text-sm font-semibold text-primary">🎉 Your {d.reward_data_mb/1000}GB reward is unlocked! Choose the network and phone number to receive it.</p>
          <label className="block text-sm">Network<select className="mt-1 w-full rounded-xl border bg-background p-3" value={network} onChange={e=>{setNetwork(e.target.value as any);setProductId("");}}>{networks.map(n=><option key={n}>{n}</option>)}</select></label>
          <label className="block text-sm">Recipient phone number<input inputMode="numeric" className="mt-1 w-full rounded-xl border bg-background p-3" placeholder="08012345678" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,11))}/></label>
          <label className="block text-sm">Available reward bundle<select className="mt-1 w-full rounded-xl border bg-background p-3" value={selected?.id??""} onChange={e=>setProductId(e.target.value)}>{options.length?options.map(p=><option key={p.id} value={p.id}>{p.plan_name}</option>):<option value="">No configured 5GB plan</option>}</select></label>
          <button disabled={busy||!selected||plans.isLoading} onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy?<Loader2 className="size-4 animate-spin"/>:"Claim reward"}</button>
          <p className="text-xs text-muted-foreground">Reward delivery is provider-dependent. If a request becomes pending, do not submit again until its status is resolved.</p>
        </div>}
    </section>

    {(d.claims??[]).length>0&&<section className="rounded-2xl border bg-card p-4 shadow-soft"><h3 className="font-display font-semibold">Reward history</h3><div className="mt-3 space-y-2">{d.claims.map((c:any)=><div key={c.id} className="rounded-xl bg-muted p-3 text-sm"><div className="flex justify-between gap-2"><span>{c.data_mb/1000}GB · {c.network}</span><strong className="capitalize">{c.status}</strong></div><p className="text-xs text-muted-foreground">To ••••{c.recipient_phone.slice(-4)} · {new Date(c.created_at).toLocaleString()}</p>{c.failure_reason&&<p className="mt-1 text-xs text-destructive">{c.failure_reason}</p>}{c.status==="failed"&&<button disabled={busy} onClick={async()=>{setBusy(true);try{const result=await claim({data:{retryClaimId:c.id}});toast[result.status==="delivered"?"success":"warning"](result.message);await qc.invalidateQueries({queryKey:["my-referral-dashboard"]});}catch(e){toast.error(e instanceof Error?e.message:"Retry failed");}finally{setBusy(false);}}} className="mt-2 rounded-lg border px-3 py-2 text-xs font-medium">Retry failed delivery</button>}</div>)}</div></section>}
  </div>;
}
