import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(s:any,userId:string){
  const {data,error}=await s.rpc("has_role",{_user_id:userId,_role:"admin"});
  if(error||!data)throw new Error("Administrator permission required.");
}
const countQuery=(db:any,table:string,filters:(q:any)=>any)=>filters(db.from(table).select("id",{count:"exact",head:true}));
const since24h=()=>new Date(Date.now()-24*60*60*1000).toISOString();
function isoWeekKey(date=new Date()){
 const d=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()));
 const day=d.getUTCDay()||7;d.setUTCDate(d.getUTCDate()+4-day);
 const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
 const week=Math.ceil((((d.getTime()-yearStart.getTime())/86400000)+1)/7);
 return String(d.getUTCFullYear())+String(week).padStart(2,"0");
}
function campaignKey(opensAt:string|null){
 if(opensAt)return new Date(opensAt).toISOString().replace(/[-:TZ.]/g,"").slice(0,14);
 return isoWeekKey();
}


export const getAdminNavigationCounts=createServerFn({method:"GET"})
 .middleware([requireSupabaseAuth])
 .handler(async({context})=>{
  await assertAdmin(context.supabase,context.userId);
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const db=supabaseAdmin as any;
  const since=since24h();
  const [customers,transactions,unresolved,referralClaims,weekendSettings,aircash,vendorSubscriptions]=await Promise.all([
    countQuery(db,"profiles",q=>q.gte("created_at",since)),
    countQuery(db,"wallet_transactions",q=>q.gte("created_at",since)),
    countQuery(db,"vtu_purchase_attempts",q=>q.in("status",["initiated","debited","pending","uncertain","refund_failed"])),
    countQuery(db,"referral_reward_claims",q=>q.in("status",["reserved","processing","pending"])),
    db.from("weekend_giveaway_settings").select("opens_at").eq("id",true).maybeSingle(),
    countQuery(db,"airtime_cash_requests",q=>q.in("status",["pending","processing","airtime_received"])),
    countQuery(db,"vendor_subscriptions",q=>q.gte("created_at",since)),
  ]);
  const campaign=campaignKey(weekendSettings.data?.opens_at??null);
  const weekend=countQuery(db,"weekend_giveaway_claim_details",q=>q.eq("campaign_key",campaign));
  const [weekendCount]=await Promise.all([weekend]);
  const safe=(r:any)=>r?.count??0;
  return {
    customers:safe(customers),
    transactions:safe(transactions)+safe(unresolved),
    referralClaims:safe(referralClaims),
    weekendClaims:safe(weekendCount),
    airtimeCash:safe(aircash),
    vendorSubscriptions:safe(vendorSubscriptions),
  };
});

export const getAdminWeekendRushClaims=createServerFn({method:"GET"})
 .middleware([requireSupabaseAuth])
 .handler(async({context})=>{
  await assertAdmin(context.supabase,context.userId);
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const db=supabaseAdmin as any;
  const {data:settings,error:settingsError}=await db.from("weekend_giveaway_settings").select("opens_at").eq("id",true).single();
  if(settingsError)throw new Error("Weekend Rush settings unavailable.");
  const campaign=campaignKey(settings?.opens_at??null);
  const {data:claims,error}=await db.from("weekend_giveaway_claim_details").select("id,campaign_key,user_id,network,recipient_phone,status,created_at,updated_at,weekend_giveaway_slots(slot_number,claimed_at)").eq("campaign_key",campaign).order("created_at",{ascending:false}).limit(100);
  if(error)throw new Error("Could not load Weekend Rush claim records.");
  const ids=[...new Set((claims??[]).map((c:any)=>c.user_id))];
  const {data:profiles}=ids.length?await db.from("profiles").select("id,full_name,username,email,phone").in("id",ids):{data:[]};
  const byId=new Map((profiles??[]).map((p:any)=>[p.id,p]));
  return (claims??[]).map((c:any)=>({...c,profile:byId.get(c.user_id)??null}));
});
