import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const supportSettingsSchema = z.object({
  phone: z.string().trim().max(30),
  whatsapp_number: z.string().trim().max(30),
  support_email: z.string().trim().email().max(254),
  whatsapp_group_url: z.string().trim().max(500).refine((v) => !v || /^https:\/\//i.test(v), "Use a valid https link."),
  support_hours: z.string().trim().min(3).max(120),
  phone_enabled: z.boolean(),
  whatsapp_enabled: z.boolean(),
  email_enabled: z.boolean(),
  group_enabled: z.boolean(),
  floating_button_enabled: z.boolean(),
});

export const getSupportSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("support_settings").select("*").eq("id", true).single();
    if (error) throw new Error("Could not load support settings.");
    return data;
  });

export const saveSupportSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => supportSettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Administrator permission required.");
    const { error } = await context.supabase.from("support_settings")
      .update({ ...data, updated_by: context.userId }).eq("id", true);
    if (error) throw new Error("Could not save support settings.");
    return { success: true };
  });
