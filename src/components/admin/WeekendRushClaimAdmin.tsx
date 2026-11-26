import {useQuery} from "@tanstack/react-query";
import {useServerFn} from "@tanstack/react-start";
import {getAdminWeekendRushClaims} from "@/lib/admin-navigation.functions";
const date=(v:string)=>new Date(v).toLocaleString("en-NG");
export function WeekendRushClaimAdmin(){
 const fn=useServerFn(getAdminWeekendRushClaims);
 const q=useQuery({queryKey:["admin","weekend-rush-claims"],queryFn:()=>fn(),refetchInterval:60000});
 return <section className="rounded-2xl border bg-card p-4 space-y-3">
  <header className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-display text-lg font-semibold">Weekend Rush applicants and winners</h2><p className="text-sm text-muted-foreground">Current campaign claims, their slot numbers, contact information and fulfilment status.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold">{q.data?.length??0} claimed</span></header>
  {q.isLoading?<div className="h-24 animate-pulse rounded-xl bg-muted"/>:q.error?<p className="text-sm text-destructive">Unable to load claims.</p>:!q.data?.length?<p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">No Weekend Rush slots claimed in the current campaign yet.</p>:
   <div className="space-y-2">{q.data.map((c:any)=><article key={c.id} className="rounded-xl border p-3 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><strong>Slot #{c.weekend_giveaway_slots?.slot_number??"—"} · {c.profile?.username?("@"+c.profile.username):c.profile?.full_name??"Customer"}</strong><span className="rounded-full bg-muted px-2 py-1 text-xs capitalize">{String(c.status).replace(/_/g," ")}</span></div>
    <p className="mt-1">{c.profile?.full_name??"Unnamed"} · {c.profile?.phone??"No phone"} · {c.profile?.email??"No email"}</p>
    <p className="text-xs text-muted-foreground">Recipient: {c.network??"Not selected"} {c.recipient_phone??""}</p>
    <p className="text-xs text-muted-foreground">Claimed: {date(c.created_at)}{c.weekend_giveaway_slots?.claimed_at?" · Slot reserved "+date(c.weekend_giveaway_slots.claimed_at):""}</p>
   </article>)}</div>}
 </section>;
}
