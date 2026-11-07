import { z } from "zod";

const amount = z.number().int().positive().max(10_000_000);
export const providerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  adapter: z.enum(["arewabundle", "unimplemented"]),
});
export const productSchema = z.object({
  id: z.string().uuid().optional(),
  provider_id: z.string().uuid(),
  service: z.enum(["data", "airtime"]),
  network_name: z.string().trim().min(2).max(80),
  network_id: z.number().int().positive(),
  plan_name: z.string().trim().min(2).max(100),
  data_plan_id: z.number().int().positive().nullable(),
  plan_type: z.string().trim().max(80).nullable(),
  validity: z.string().trim().max(80).nullable(),
  cost_kobo: amount.nullable(),
  selling_price_kobo: amount.nullable(),
  min_amount_kobo: amount.nullable(),
  max_amount_kobo: amount.nullable(),
  markup_percent: z.number().min(0).max(100),
  active: z.boolean(),
}).superRefine((p, ctx) => {
  if (p.service === "data" && (!p.data_plan_id || !p.selling_price_kobo))
    ctx.addIssue({ code: "custom", message: "Data plans require actual provider plan IDs and a selling price." });
  if (p.service === "airtime" && p.data_plan_id !== null)
    ctx.addIssue({ code: "custom", message: "Airtime cannot use a data plan ID." });
  if (p.min_amount_kobo !== null && p.max_amount_kobo !== null && p.min_amount_kobo > p.max_amount_kobo)
    ctx.addIssue({ code: "custom", message: "Maximum amount must be at least the minimum." });
});

// The supplied purchase response contract is not yet verified. HTTP 200,
// arbitrary status strings and unsigned callbacks cannot settle wallet orders.
export function unverifiedPurchaseOutcome(_response: unknown): "pending_review" {
  return "pending_review";
}

export function hasAccessToken(value: unknown): boolean {
  return typeof value === "object" && value !== null && "AccessToken" in value
    && typeof value.AccessToken === "string" && value.AccessToken.trim().length > 0;
}