import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasAccessToken, productSchema, providerSchema } from "./vtu-schemas";

export const getProviderControl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Administrator permission required.");
    const [providers, products, audit] = await Promise.all([
      context.supabase.from("vtu_providers").select("*").order("created_at"),
      context.supabase.from("vtu_products").select("*").eq("archived", false).order("created_at"),
      context.supabase.from("vtu_configuration_audit").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    if (providers.error || products.error || audit.error) throw new Error("Could not load provider settings.");
    return { providers: providers.data, products: products.data, audit: audit.data };
  });

export const addProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => providerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Administrator permission required.");
    const result = await context.supabase.from("vtu_providers").insert(data).select("id").single();
    if (result.error) throw new Error("Could not add provider; Arewabundle can only be added once.");
    return result.data;
  });

export const saveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Administrator permission required.");
    const { id, ...values } = data;
    const result = id
      ? await context.supabase.from("vtu_products").update(values).eq("id", id).select("id").single()
      : await context.supabase.from("vtu_products").insert(values).select("id").single();
    if (result.error) throw new Error("Could not save this mapping.");
    return result.data;
  });

export const archiveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Administrator permission required.");
    const result = await context.supabase.from("vtu_products").update({ archived: true, active: false }).eq("id", data.id).select("id").single();
    if (result.error) throw new Error("Could not remove the mapping.");
    return { removed: true };
  });

export const testProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Administrator permission required.");
    const { data: provider } = await context.supabase.from("vtu_providers").select("adapter").eq("id", data.id).single();
    if (provider?.adapter !== "arewabundle") return { ok: false, message: "This provider has no implemented connection." };
    const gatewayKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["UDC_AREWABUNDLE_ACCOUNT_API_KEY"];
    let ok = false;
    let status: "authenticated" | "error" | "not_configured" = "not_configured";
    let message = "Arewabundle account credentials are not configured.";
    if (gatewayKey && connectionKey) {
      status = "error";
      try {
        const response = await fetch("https://connector-gateway.lovable.dev/udc_arewabundle_account/api/user", {
          method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
          headers: { Authorization: `Bearer ${gatewayKey}`, "X-Connection-Api-Key": connectionKey, Accept: "application/json" },
        });
        // Never persist, log or return raw account bodies: they contain tokens.
        ok = response.ok && hasAccessToken(await response.json());
        message = ok ? "Account authentication passed. Purchases remain disabled pending provider response verification and approved testing."
          : `Account authentication did not pass (HTTP ${response.status}). Check the Arewabundle connection.`;
        if (ok) status = "authenticated";
      } catch {
        message = "Account authentication could not be completed. No purchase was made.";
      }
    }
    const now = new Date().toISOString();
    const result = await context.supabase.from("vtu_providers").update({
      connection_status: status, last_checked_at: now, last_error: ok ? null : message,
      ...(ok ? { last_authenticated_at: now } : {}),
    }).eq("id", data.id).select("id").single();
    if (result.error) throw new Error("Could not record the connection check.");
    return { ok, message };
  })
export const adjustCustomerWallet = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
      .inputValidator((input) =>
          z.object({
                userId: z.string().uuid(),
                      category: z.enum(["deposit", "promotional", "reward"]),
                            amountNaira: z.number().positive().max(1000000),
                                  action: z.enum(["credit", "debit"]),
                                        description: z.string().min(2).max(120),
                                            }).parse(input)
                                              )
                                                .handler(async ({ data, context }) => {
                                                    const { data: admin } = await context.supabase.rpc("has_role", {
                                                          _user_id: context.userId,
                                                                _role: "admin",
                                                                    });
                                                                        if (!admin) throw new Error("Administrator permission required.");

                                                                            const kobo = Math.round(data.amountNaira * 100);
                                                                                const amountKobo = data.action === "credit" ? kobo : -kobo;
                                                                                    const ref = `manual:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

                                                                                        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                                                                                            const { data: txnId, error } = await supabaseAdmin.rpc("wallet_post", {
                                                                                                  _user_id: data.userId,
                                                                                                        _category: data.category,
                                                                                                              _amount_kobo: amountKobo,
                                                                                                                    _reference: ref,
                                                                                                                          _description: data.description,
                                                                                                                              });

                                                                                                                                  if (error) throw new Error(error.message || "Failed to update wallet balance.");
                                                                                                                                      return { success: true, txnId };
                                                                                                                                        });
                                                                                                                                        