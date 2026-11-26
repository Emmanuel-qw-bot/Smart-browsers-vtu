import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const settingsSchema = z.object({
  enabled: z.boolean(),
  announcement: z.string().trim().min(5).max(500),
  reward_data_mb: z.number().int().min(100).max(10000),
  minimum_data_purchases: z.number().int().min(1).max(10000),
  maximum_winners: z.number().int().min(1).max(100),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  mtn_network_id:z.string().max(100).nullable().or(z.string().max(100)),mtn_data_plan_id:z.string().max(100),
  airtel_network_id:z.string().max(100),airtel_data_plan_id:z.string().max(100),
  glo_network_id:z.string().max(100),glo_data_plan_id:z.string().max(100),
}).refine((v) => !v.opens_at || !v.closes_at || new Date(v.closes_at) > new Date(v.opens_at), {
  message: "Closing time must be after opening time.",
});

export const getWeekendGiveawaySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("weekend_giveaway_settings").select("*").eq("id", true).single();
    if (error) throw new Error("Could not load Weekend Rush settings.");
    return data;
  });

export const saveWeekendGiveawaySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => settingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Administrator permission required.");
    const { error } = await context.supabase.from("weekend_giveaway_settings").update(data).eq("id", true);
    if (error) throw new Error("Could not save Weekend Rush settings.");
    return { success: true };
  });
