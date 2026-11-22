import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Save } from "lucide-react";
import { getAdminReferralData, saveReferralSettings, verifyReferralDeposit } from "@/lib/referral.functions";

const cash=(k:number)=>"₦"+(k/100).toLocaleString("en-NG");
export function AdminReferralSettings(){
 const qc=useQueryClient();
 const query=useQuery({queryKey:["admin-referral-data"],queryFn:()=>getAdminReferralData()});
 const save=useServerFn(saveReferralSettings);
 const verify=useServerFn(verifyReferralDeposit);
 const [draft,setDraft]=useState<any>(null);
 const [busy,setBusy]=useState("");
 const d:any=query.data;
 const s=draft??d?.settings;
 const profiles=new Map((d?.profiles??[]).map((p:any)=>[p.id,p]));
 const qualifiedIds=new Set((d?.qualifications??[]).map((q:any)=>q.qualifying_wallet_transaction_id));
 async function saveSettings(){
   if(!s)return;setBusy("save");
   try{await save({data:{enabled:s.enabled,required_referrals:Number(s.required_referrals),minimum_funding_kobo:Number(s.minimum_funding_kobo),reward_data_mb:Number(s.reward_data_mb)}});
     toast.success("Referral settings saved");setDraft(null);await qc.invalidateQueries({queryKey:["admin-referral-data"]});
   }catch(e){toast.error(e instanceof Error?e.message:"Could not save settings");}finally{setBusy("");}
 }
 async function verifyDeposit(id:string){
   const note=prompt("Confirm you verified this funding externally. Add a note (optional):");
   if(note===null)return;
   setBusy(id);
   try{await verify({data:{transactionId:id,note}});toast.success("Deposit marked as qualifying referral funding");await qc.invalidateQueries({queryKey:["admin-referral-data"]});await qc.invalidateQueries({queryKey:["my-referral-dashboard"]});}
   catch(e){toast.error(e instanceof Error?e.message:"Verification failed");}finally{setBusy("");}
 }
 if(query.isLoading)return <div className="h-40 animate-pulse rounded-2xl bg-muted"/>;
 if(query.error)return <p className="text-sm text-destructive">Could not load referral admin data.</p>;
 return <div className="space-y-5">
  <section className="rounded-2xl border bg-card p-4 space-y-4">
   <div><h2 className="font-display text-lg font-semibold">Referral reward rules</h2><p className="text-xs text-muted-foreground">Settings are enforced by the database, not just the interface.</p></div>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.enabled} onChange={e=>setDraft({...s,enabled:e.target.checked})}/> Enable referral rewards</label>
   <div className="grid gap-3 sm:grid-cols-3">
    <label className="text-sm">Required qualified friends<input type="number" min="1" max="100" className="mt-1 w-full rounded-xl border bg-background p-3" value={s.required_referrals} onChange={e=>setDraft({...s,required_referrals:Number(e.target.value)})}/></label>
    <label className="text-sm">Minimum funding (₦)<input type="number" min="500" className="mt-1 w-full rounded-xl border bg-background p-3" value={Number(s.minimum_funding_kobo)/100} onChange={e=>setDraft({...s,minimum_funding_kobo:Math.round(Number(e.target.value)*100)})}/></label>
    <label className="text-sm">Reward data (MB)<input type="number" min="100" className="mt-1 w-full rounded-xl border bg-background p-3" value={s.reward_data_mb} onChange={e=>setDraft({...s,reward_data_mb:Number(e.target.value)})}/></label>
   </div>
   <button disabled={busy==="save"} onClick={saveSettings} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy==="save"?<Loader2 className="size-4 animate-spin"/>:<Save className="size-4"/>}Save rules</button>
  </section>

  <section className="rounded-2xl border bg-card p-4 space-y-3">
   <div><h2 className="font-display text-lg font-semibold">Verify referral wallet funding</h2><p className="text-xs text-muted-foreground">Manual wallet credits do NOT qualify automatically. Verify the actual payment first, then mark the deposit eligible. Only deposit-category transactions ≥ configured minimum are accepted.</p></div>
   {(d.deposits??[]).filter((t:any)=>!qualifiedIds.has(t.id)).length===0?<p className="text-sm text-muted-foreground">No unverified qualifying deposit transactions.</p>:
    <div className="space-y-2">{d.deposits.filter((t:any)=>!qualifiedIds.has(t.id)).map((t:any)=>{
      const p:any=profiles.get(t.user_id);
      return <article key={t.id} className="rounded-xl bg-muted p-3 text-sm">
       <div className="flex flex-wrap items-start justify-between gap-2"><div><strong>{p?.full_name??"Customer"}</strong><p className="text-xs text-muted-foreground">{p?.phone??t.user_id} · {p?.email??""}</p></div><strong>{cash(t.amount_kobo)}</strong></div>
       <p className="mt-1 text-xs text-muted-foreground">{t.description} · {new Date(t.created_at).toLocaleString()}</p>
       <button disabled={busy===t.id} onClick={()=>verifyDeposit(t.id)} className="mt-2 inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50">{busy===t.id?<Loader2 className="size-3 animate-spin"/>:<ShieldCheck className="size-3"/>}Verify and qualify</button>
      </article>
    })}</div>}
  </section>

  <section className="rounded-2xl border bg-card p-4"><h2 className="font-display text-lg font-semibold">Referral overview</h2>
   <div className="mt-3 space-y-2">{(d.referrals??[]).map((p:any)=><div key={p.id} className="flex justify-between gap-3 rounded-xl bg-muted p-3 text-sm"><div><strong>{p.full_name}</strong><p className="text-xs text-muted-foreground">Referred by {(profiles.get(p.referred_by) as any)?.full_name??p.referred_by}</p></div><span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span></div>)}</div>
   {(d.referrals??[]).length===0&&<p className="mt-2 text-sm text-muted-foreground">No referred accounts yet.</p>}
  </section>

  <section className="rounded-2xl border bg-card p-4"><h2 className="font-display text-lg font-semibold">Reward claims</h2>
   {(d.claims??[]).length===0?<p className="mt-2 text-sm text-muted-foreground">No rewards claimed yet.</p>:<div className="mt-3 space-y-2">{d.claims.map((c:any)=><div key={c.id} className="rounded-xl bg-muted p-3 text-sm"><div className="flex justify-between gap-2"><strong>{c.data_mb/1000}GB · {c.network}</strong><span className="capitalize">{c.status}</span></div><p className="text-xs text-muted-foreground">Recipient ••••{c.recipient_phone.slice(-4)} · {c.referrer_user_id}</p><p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>{c.failure_reason&&<p className="mt-1 text-xs text-destructive">{c.failure_reason}</p>}</div>)}</div>}
  </section>
 </div>;
}
