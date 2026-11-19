import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasAccessToken, productSchema, providerSchema } from "./vtu-schemas";

export const getProviderControl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
        const { data: admin, error } = await context.supabase.rpc("has_role", {
              _user_id: context.userId,
                    _role: "admin",
                        });
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
                                                                  .middleware([requireSupabaseAuth])
                                                                    .inputValidator((input) => providerSchema.parse(input))
                                                                      .handler(async ({ data, context }) => {
                                                                          const { data: admin } = await context.supabase.rpc("has_role", {
                                                                                _user_id: context.userId,
                                                                                      _role: "admin",
                                                                                          });
                                                                                              if (!admin) throw new Error("Administrator permission required.");
const result = await context.supabase.from("vtu_providers").insert(data).select("id").single();
    if (result.error) throw new Error("Could not add provider; Arewabundle can only be added once.");
        return result.data;
          });
          export const saveProduct = createServerFn({ method: "POST" })
            .middleware([requireSupabaseAuth])
              .inputValidator((input) => productSchema.parse(input))
                .handler(async ({ data, context }) => {
                    const { data: admin } = await context.supabase.rpc("has_role", {
                          _user_id: context.userId,
                                _role: "admin",
                                    });
                                        if (!admin) throw new Error("Administrator permission required.");
const { id, ...values } = data;
    const result = id
          ? await context.supabase.from("vtu_products").update(values).eq("id", id).select("id").single()
                : await context.supabase.from("vtu_products").insert(values).select("id").single();
                    if (result.error) throw new Error("Could not save this mapping.");
                        return result.data;
                          });
                          export const archiveProduct = createServerFn({ method: "POST" })
                            .middleware([requireSupabaseAuth])
                              .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
                                .handler(async ({ data, context }) => {
                                    const { data: admin } = await context.supabase.rpc("has_role", {
                                          _user_id: context.userId,
                                                _role: "admin",
                                                    });
                                                        if (!admin) throw new Error("Administrator permission required.");
const result = await context.supabase.from("vtu_products").update({ archived: true, active: false }).eq("id", data.id).select("id").single();
    if (result.error) throw new Error("Could not remove the mapping.");
        return { removed: true };
          });

          export const testProviderConnection = createServerFn({ method: "POST" })
            .middleware([requireSupabaseAuth])
              .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
                .handler(async ({ data, context }) => {
                    const { data: admin } = await context.supabase.rpc("has_role", {
                          _user_id: context.userId,
                                _role: "admin",
                                    });
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
                                  method: "POST",
                                            redirect: "error",
                                                      signal: AbortSignal.timeout(20000),
                                                                headers: {
                                                                            Authorization: `Bearer ${gatewayKey}`,
                                                                                        "X-Connection-Api-Key": connectionKey,
                                                                                                    Accept: "application/json",
                                                                                                              },
                                                                                                                      });
                                                                                                                              ok = response.ok && hasAccessToken(await response.json());
                                                                                                                                      message = ok
                                                                                                                                                ? "Account authentication passed. Customer purchases remain disabled until the purchase flow is verified."
                                                                                                                                                          : `Account authentication did not pass (HTTP ${response.status}). Check credentials.`;
                                                                                                                                                                  if (ok) status = "authenticated";
                                                                                                                                                                        } catch {
                                                                                                                                                                                message = "Account authentication could not be completed.";
                                                                                                                                                                                      }
                                                                                                                                                                                          }
const now = new Date().toISOString();
    await context.supabase
          .from("vtu_providers")
                .update({
                        connection_status: status,
                                last_checked_at: now,
                                        last_error: ok ? null : message,
                                                ...(ok ? { last_authenticated_at: now } : {}),
                                                      })
                                                            .eq("id", data.id);

                                                                return { ok, message };
                                                                  });
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
export const getCustomerProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
        const { data, error } = await context.supabase
              .from("vtu_products")
                    .select("id, service, network_name, network_id, plan_name, validity, selling_price_kobo, min_amount_kobo, max_amount_kobo")
                          .eq("active", true)
                                .eq("archived", false)
                                      .order("selling_price_kobo", { ascending: true });

                                          if (error) throw new Error("Could not load products.");
                                              return { products: data ?? [], purchasesAvailable: true };
                                                });
function normalizePhone(raw: string): string {
      const cleaned = raw.replace(/\D/g, "");
        if (cleaned.startsWith("0") && cleaned.length === 11) {
            return cleaned;
              }
                if (cleaned.startsWith("234") && cleaned.length === 13) {
                    return "0" + cleaned.slice(3);
                      }
                        if (cleaned.length === 10) {
                            return "0" + cleaned;
                              }
                                return cleaned;
                                }
                                export const purchaseAirtime = createServerFn({ method: "POST" })
                                  .middleware([requireSupabaseAuth])
                                    .inputValidator((input) =>
                                        z.object({
                                              networkId: z.number().int().positive(),
                                                    networkName: z.string().min(1),
                                                          phone: z.string().min(10).max(15),
                                                                amountNaira: z.number().int().min(50).max(10000),
                                                                    }).parse(input)
                                                                      )
                                                                        .handler(async ({ data, context }) => {
                                                                            const formattedPhone = normalizePhone(data.phone);
                                                                                if (!/^0\d{10}$/.test(formattedPhone)) {
                                                                                      throw new Error("Invalid Nigerian phone number. Example: 08012345678");
                                                                                          }


const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fail closed: an authenticated provider connection alone never authorizes purchases.
    const { data: serviceMapping, error: mappingError } = await supabaseAdmin
      .from("vtu_products")
      .select("id, provider_id, vtu_providers!inner(enabled, airtime_enabled, adapter)")
      .eq("service", "airtime")
      .eq("network_id", data.networkId)
      .eq("active", true)
      .eq("archived", false)
      .maybeSingle();

    const providerSettings = serviceMapping?.vtu_providers as
      | { enabled: boolean; airtime_enabled: boolean; adapter: string }
      | null;

    if (mappingError || !serviceMapping || !providerSettings?.enabled ||
        !providerSettings.airtime_enabled || providerSettings.adapter !== "arewabundle") {
      throw new Error("Airtime purchases are not enabled for this network yet. Your wallet has not been charged.");
    }

    const amountKobo = data.amountNaira * 100;

        // Check customer's wallet balance
            const { data: wallet, error: walletError } = await supabaseAdmin
                  .from("wallets")
                        .select("balance_kobo")
                              .eq("user_id", context.userId)
                                    .single();

                                        if (walletError || !wallet || wallet.balance_kobo < amountKobo) {
                                              throw new Error(`Insufficient wallet balance. You need ₦${data.amountNaira} to purchase.`);
                                                  }

                                                      // Atomically debit wallet
                                                          const purchaseRef = `Airtime_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                                                              const { error: debitError } = await supabaseAdmin.rpc("wallet_post", {
                                                                    _user_id: context.userId,
                                                                          _category: "purchase",
                                                                                _amount_kobo: -amountKobo,
                                                                                      _reference: purchaseRef,
                                                                                            _description: `Airtime: ₦${data.amountNaira} to ${data.phone} (${data.networkName})`,
                                                                                                });
if (debitError) {
          throw new Error("Could not debit wallet. Please try again.");
              }

                  // Call Arewabundle Topup API via secure Gateway
                      const gatewayKey = process.env["LOVABLE_API_KEY"];
                          const connectionKey = process.env["UDC_AREWABUNDLE_ACCOUNT_API_KEY"];

                              if (!gatewayKey || !connectionKey) {
                                    // Refund if connector credentials are not linked
                                          await supabaseAdmin.rpc("wallet_post", {
                                                  _user_id: context.userId,
                                                          _category: "refund",
                                                                  _amount_kobo: amountKobo,
                                                                          _reference: `refund:${purchaseRef}`,
                                                                                  _description: `Refund: Provider credentials missing`,
                                                                                        });
                                                                                              throw new Error("VTU provider is currently offline. Your wallet has not been charged.");
                                                                                                  }
        try {
                  // 1. Get fresh AccessToken from Arewabundle
                        const authRes = await fetch("https://connector-gateway.lovable.dev/udc_arewabundle_account/api/user", {
                                method: "POST",
                                        signal: AbortSignal.timeout(15000),
                                                headers: {
                                                          Authorization: `Bearer ${gatewayKey}`,
                                                                    "X-Connection-Api-Key": connectionKey,
                                                                              Accept: "application/json",
                                                                                      },
                                                                                            });
                                                                                                  const authData = (await authRes.json().catch(() => null)) as { AccessToken?: string } | null;
                                                                                                        const accessToken = authData?.AccessToken;

                                                                                                              if (!authRes.ok || !accessToken) {
                                                                                                                      await supabaseAdmin.rpc("wallet_post", {
                                                                                                                                _user_id: context.userId,
                                                                                                                                          _category: "refund",
                                                                                                                                                    _amount_kobo: amountKobo,
                                                                                                                                                              _reference: `refund:${purchaseRef}`,
                                                                                                                                                                        _description: "Refund: Could not obtain provider access token",
                                                                                                                                                                                });
                                                                                                                                                                                        throw new Error("Could not authenticate with provider. Your wallet has been refunded.");
                                                                                                                                                                                              }

                                                                                                                                                                                                    // 2. Dispatch topup with the required Authorization: Token header
                                                                                                                                                                                                          const response = await fetch("https://api.arewabundle.com.ng/api/topup", {
                                                                                                                                                                                                                  method: "POST",
                                                                                                                                                                                                                          signal: AbortSignal.timeout(30000),
                                                                                                                                                                                                                                  headers: {
                                                                                                                                                                                                                                            Authorization: `Token ${accessToken}`,
                                                                                                                                                                                                                                                      "Content-Type": "application/json",
                                                                                                                                                                                                                                                                Accept: "application/json",
                                                                                                                                                                                                                                                                        },
                                                                                                                                                                                                                                                                                body: JSON.stringify({
                                                                                                                                                                                                                                                                                      network: data.networkId,
                                                                                                                                                                                                                                                                                        phone: formattedPhone,
                                                                                                                                                                                                                                                                                          plan_type: "VTU",
                                                                                                                                                                                                                                                                                            bypass: false,
                                                                                                                                                                                                                                                                                              amount: data.amountNaira,
                                                                                                                                                                                                                                                                                                "request-id": purchaseRef,
                                                                                                                                                                                                                                                                                                })
                                                                                                                                                                                                                                                                                                                                      });
                                                                                                                                                                                                                                                                                                                                            const responseBody = (await response.json().catch(() => null)) as { status?: string; message?: string } | null;
                                                                                                                                                                                                                                                                                                                                                  const isSuccess = response.ok && responseBody?.status === "success";

                                                                                                                                                                                                                                                                                                                                                        if (!isSuccess) {
                                                                                                                                                                                                                                                                                                                                                                const msg = responseBody?.message || `Provider topup failed (${response.status})`;
                                                                                                                                                                                                                                                                                                                                                                        await supabaseAdmin.rpc("wallet_post", {
                                                                                                                                                                                                                                                                                                                                                                                  _user_id: context.userId,
                                                                                                                                                                                                                                                                                                                                                                                            _category: "refund",
                                                                                                                                                                                                                                                                                                                                                                                                      _amount_kobo: amountKobo,
                                                                                                                                                                                                                                                                                                                                                                                                                _reference: `refund:${purchaseRef}`,
                                                                                                                                                                                                                                                                                                                                                                                                                          _description: `Refund: ${msg}`,
                                                                                                                                                                                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                                                                                                                                                                                          throw new Error(msg);
                                                                                                                                                                                                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                                                                                                                                                                                                      return {
                                                                                                                                                                                                                                                                                                                                                                                                                                                              success: true,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                      message: `₦${data.amountNaira} airtime has been sent to ${data.phone}!`,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              reference: purchaseRef,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    };

                                      } catch (err) {
                                            // A timeout or lost connection does not prove the provider failed.
                                            // Keep the debit for manual reconciliation; never auto-refund an ambiguous outcome.
                                            if (err instanceof Error && err.message.includes("Refund:")) {
                                              throw err;
                                            }
                                            throw new Error(
                                              "Your request may still be processing. Your wallet has not been automatically refunded. Contact support with reference " +
                                                purchaseRef + " so the provider transaction can be checked."
                                            );
                                          }
                                        });                                                            

/**
 * Arewabundle data purchase.
 * Fail-closed: both provider switches must be enabled by an administrator.
 * Unknown/timeout outcomes are deliberately NOT refunded automatically.
 */
export const purchaseData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    productId: z.string().uuid(),
    phone: z.string().min(10).max(15),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!/^0\\d{10}$/.test(phone)) {
      throw new Error("Enter a valid Nigerian phone number, for example 08012345678.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product, error: productError } = await supabaseAdmin
      .from("vtu_products")
      .select("id, provider_id, service, network_id, network_name, plan_name, data_plan_id, selling_price_kobo, vtu_providers!inner(adapter, enabled, data_enabled)")
      .eq("id", data.productId)
      .eq("service", "data")
      .eq("active", true)
      .eq("archived", false)
      .maybeSingle();

    const provider = product?.vtu_providers as
      | { adapter: string; enabled: boolean; data_enabled: boolean }
      | null;

    if (productError || !product || !provider ||
        provider.adapter !== "arewabundle" || !provider.enabled ||
        !provider.data_enabled || !product.data_plan_id ||
        !product.selling_price_kobo) {
      throw new Error("Data purchases are not enabled yet. Your wallet has not been charged.");
    }

    // A unique reference prevents accidental duplicate ledger postings.
    const reference = `DATA-${crypto.randomUUID()}`;
    const price = Number(product.selling_price_kobo);
    const { error: debitError } = await supabaseAdmin.rpc("wallet_post", {
      _user_id: context.userId,
      _category: "purchase",
      _amount_kobo: -price,
      _reference: reference,
      _description: `Data: ${product.plan_name} to ${phone} (${product.network_name})`,
    });
    if (debitError) {
      throw new Error("Wallet debit failed. No data request was sent.");
    }

    const gatewayKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["UDC_AREWABUNDLE_ACCOUNT_API_KEY"];
    if (!gatewayKey || !connectionKey) {
      await supabaseAdmin.rpc("wallet_post", {
        _user_id: context.userId,
        _category: "refund",
        _amount_kobo: price,
        _reference: `refund:${reference}`,
        _description: "Refund: Arewabundle credentials unavailable before request",
      });
      throw new Error("Provider connection is unavailable. The wallet debit was reversed.");
    }

    try {
      const authResponse = await fetch(
        "https://connector-gateway.lovable.dev/udc_arewabundle_account/api/user",
        {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(15000),
          headers: {
            Authorization: `Bearer ${gatewayKey}`,
            "X-Connection-Api-Key": connectionKey,
            Accept: "application/json",
          },
        },
      );
      const authBody = await authResponse.json().catch(() => null);
      if (!authResponse.ok || !hasAccessToken(authBody)) {
        await supabaseAdmin.rpc("wallet_post", {
          _user_id: context.userId,
          _category: "refund",
          _amount_kobo: price,
          _reference: `refund:${reference}`,
          _description: "Refund: provider authentication failed before data request",
        });
        throw new Error("Provider authentication failed. The wallet debit was reversed.");
      }

      const token = (authBody as { AccessToken: string }).AccessToken;
      const response = await fetch("https://api.arewabundle.com.ng/api/data", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(25000),
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          network: product.network_id,
          phone,
          data_plan: product.data_plan_id,
          bypass: false,
          "request-id": reference,
        }),
      });
      const body = await response.json().catch(() => null) as
        | { status?: string; message?: string; response?: string }
        | null;

      if (response.ok && body?.status === "success") {
        return {
          success: true,
          status: "success" as const,
          reference,
          message: `${product.plan_name} request was accepted for ${phone}. Please confirm delivery before retrying.`,
        };
      }

      if (body?.status === "fail") {
        await supabaseAdmin.rpc("wallet_post", {
          _user_id: context.userId,
          _category: "refund",
          _amount_kobo: price,
          _reference: `refund:${reference}`,
          _description: `Refund: Arewabundle reported failure for ${reference}`,
        });
        throw new Error(body.message || "Arewabundle reported that the data purchase failed. Your wallet debit was reversed.");
      }

      // Any undocumented status, non-JSON response, or HTTP error is ambiguous.
      // Leave the debit in the ledger for admin reconciliation; never guess/refund.
      throw new Error(`Purchase status needs review. Do not retry yet. Reference: ${reference}`);
    } catch (error) {
      if (error instanceof Error &&
          (error.message.includes("wallet debit was reversed") ||
           error.message.includes("status needs review"))) {
        throw error;
      }
      throw new Error(`The provider response is uncertain. Do not retry yet. Contact support with reference: ${reference}`);
    }
  });
