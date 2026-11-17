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
      : (() => { const d = new Date(); return `${d.getUTCFullYear()}W${String(Math.ceil((((d.getTime()-Date.UTC(d.getUTCFullYear(),0,1))/86400000)+new Date(Date.UTC(d.getUTCFullYear(),0,1)).getUTCDay()+1)/7)).padStart(2,"0")}`; })();
    const { data, error } = await context.supabase.from("weekend_giveaway_slots").select("slot_number,status").eq("campaign_key", campaignKey).order("slot_number");
    if (error) throw new Error("Could not load giveaway slots.");
    return Array.from({ length: settings.maximum_winners }, (_, i) => data?.find(s => s.slot_number === i + 1) ?? { slot_number: i + 1, status: "available" as const });
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
