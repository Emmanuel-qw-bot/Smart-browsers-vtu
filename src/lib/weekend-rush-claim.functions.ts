import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getWeekendRushSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: settings, error: settingsError } = await context.supabase.from("weekend_giveaway_settings").select("opens_at,maximum_winners").eq("id", true).single();
    if (settingsError) throw new Error("Could not load giveaway slots.");
    const campaignKey = settings.opens_at
      ? new Date(settings.opens_at).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)
      : (() => {
          const d = new Date();
          const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
          day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
          const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
          const week = Math.ceil((((day.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
          return String(day.getUTCFullYear()) + String(week).padStart(2, "0");
        })();
    const { data, error } = await context.supabase.from("weekend_giveaway_slots").select("slot_number,status").eq("campaign_key", campaignKey).order("slot_number");
    if (error) throw new Error("Could not load giveaway slots.");
    return Array.from({ length: settings.maximum_winners }, (_, i) => data?.find(s => s.slot_number === i + 1) ?? { slot_number: i + 1, status: "available" as const });
  });


function currentCampaignKey(opensAt:string|null){
  if(opensAt) return new Date(opensAt).toISOString().replace(/[-:TZ.]/g,"").slice(0,14);
  const d=new Date();const utcDay=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
  utcDay.setUTCDate(utcDay.getUTCDate()+4-(utcDay.getUTCDay()||7));
  const yearStart=new Date(Date.UTC(utcDay.getUTCFullYear(),0,1));
  const week=Math.ceil((((utcDay.getTime()-yearStart.getTime())/86400000)+1)/7);
  return String(utcDay.getUTCFullYear())+String(week).padStart(2,"0");
}
export const getWeekendRushEligibility=createServerFn({method:"GET"})
 .middleware([requireSupabaseAuth])
 .handler(async({context})=>{
  const {data:settings,error:settingsError}=await context.supabase.from("weekend_giveaway_settings").select("enabled,minimum_data_purchases,opens_at,closes_at,maximum_winners,reward_data_mb").eq("id",true).single();
  if(settingsError||!settings)throw new Error("Could not load Weekend Rush eligibility.");
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const db=supabaseAdmin as any;
  const {count,error}=await db.from("vtu_purchase_attempts").select("id",{count:"exact",head:true}).eq("user_id",context.userId).eq("service","data").eq("status","successful");
  if(error)throw new Error("Could not verify your successful data purchases.");
  const campaign=currentCampaignKey(settings.opens_at);
  const {data:claim,error:claimError}=await db.from("weekend_giveaway_claim_details").select("id,status,network,recipient_phone,slot_id,created_at").eq("campaign_key",campaign).eq("user_id",context.userId).maybeSingle();
  if(claimError)throw new Error("Could not load your Weekend Rush claim.");
  let slotNumber:number|null=null;
  if(claim?.slot_id){
    const {data:slot}=await db.from("weekend_giveaway_slots").select("slot_number").eq("id",claim.slot_id).maybeSingle();
    slotNumber=slot?.slot_number??null;
  }
  const now=Date.now(),opens=settings.opens_at?new Date(settings.opens_at).getTime():null,closes=settings.closes_at?new Date(settings.closes_at).getTime():null;
  const isOpen=!!settings.enabled&&(opens===null||now>=opens)&&(closes===null||now<=closes);
  const purchases=count??0;
  return {campaign_key:campaign,successful_data_purchases:purchases,minimum_data_purchases:settings.minimum_data_purchases,eligible:purchases>=settings.minimum_data_purchases,is_open:isOpen,has_claim:!!claim,claim:claim?{...claim,slot_number:slotNumber}:null,reward_data_mb:settings.reward_data_mb,maximum_winners:settings.maximum_winners};
});

export const claimWeekendRushSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("weekend_rush_claim_slot");
    if (error) throw new Error(error.message || "Could not claim a slot.");
    return data as { slot_number: number; status: string; campaign_key: string };
  });

const recipientSchema = z.object({
  network: z.enum(["MTN", "Airtel", "Glo"]),
  phone: z.string().regex(/^(0[789][01][0-9]{8}|234[789][01][0-9]{8})$/, "Enter a valid Nigerian mobile number."),
});
export const saveWeekendRushRecipient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => recipientSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("weekend_rush_save_recipient", { _network: data.network, _phone: data.phone });
    if (error) throw new Error(error.message || "Could not save reward details.");
    return result;
  });
