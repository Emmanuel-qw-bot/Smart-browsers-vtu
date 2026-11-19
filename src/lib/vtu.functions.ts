import { createServerFn } from "@tanstack/react-start";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasAccessToken, productSchema, providerSchema } from "./vtu-schemas";

const credentialsKey = () => {
  const raw = process.env["VTU_CREDENTIALS_ENCRYPTION_KEY"];
  if (!raw || !/^[a-fA-F0-9]{64}$/.test(raw)) {
    throw new Error("Provider credential encryption key is not configured (64-character hex key).");
  }
  return Buffer.from(raw, "hex");
};
function encryptProviderSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", credentialsKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("hex"), cipher.getAuthTag().toString("hex"), encrypted.toString("hex")].join(":");
}
function decryptProviderSecret(value: string | null): string | null {
  if (!value) return null;
  const [ivHex, tagHex, encryptedHex] = value.split(":");
  if (!ivHex || !tagHex || !encryptedHex) throw new Error("Stored provider credential format is invalid.");
  const decipher = createDecipheriv("aes-256-gcm", credentialsKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]).toString("utf8");
}

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
    if (result.error) throw new Error("Could not add provider; each provider adapter can only be added once.");
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

          export const saveProviderCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    apiToken: z.string().trim().min(1).max(5000).optional(),
    transactionPin: z.string().trim().min(1).max(100).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Administrator permission required.");
    if (!data.apiToken && !data.transactionPin) throw new Error("Enter at least one credential to save.");
    const update: Record<string, string> = {};
    if (data.apiToken) update.api_token_encrypted = encryptProviderSecret(data.apiToken);
    if (data.transactionPin) update.transaction_pin_encrypted = encryptProviderSecret(data.transactionPin);
    const result = await (context.supabase.from("vtu_providers") as any).update(update).eq("id", data.id).select("id").single();
    if (result.error) throw new Error("Could not save encrypted provider credentials.");
    return { saved: true };
  });

export const deleteProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!admin) throw new Error("Administrator permission required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const products = await supabaseAdmin.from("vtu_products").delete().eq("provider_id", data.id);
    if (products.error) throw new Error("Could not remove provider mappings.");
    const provider = await supabaseAdmin.from("vtu_providers").delete().eq("id", data.id).select("id").single();
    if (provider.error) throw new Error("Could not delete provider.");
    return { deleted: true };
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

    const { data: provider } = await context.supabase
      .from("vtu_providers")
      .select("*")
      .eq("id", data.id)
      .single();

    let ok = false;
    let status: "authenticated" | "error" | "not_configured" = "not_configured";
    let message = "Provider credentials are not configured.";

    if (provider?.adapter === "arewabundle") {
      const gatewayKey = process.env["LOVABLE_API_KEY"];
      const connectionKey = process.env["UDC_AREWABUNDLE_ACCOUNT_API_KEY"];
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
          message = ok ? "Arewabundle account authentication passed." : `Authentication failed (HTTP ${response.status}).`;
          if (ok) status = "authenticated";
        } catch {
          message = "Arewabundle authentication could not be completed.";
        }
      }
    } else if (provider?.adapter === "bigisub") {
      const token = process.env["BIGISUB_API_TOKEN"];
      if (token) {
        status = "error";
        try {
          const response = await fetch("https://api.bigisub.ng/api/v2/financial/wallet/balance/", {
            method: "GET",
            redirect: "error",
            signal: AbortSignal.timeout(15000),
            headers: { Authorization: `Token ${token}`, Accept: "application/json" },
          });
          const body = await response.json().catch(() => null) as {
            success?: boolean;
            data?: { balance?: number | string; pending_amount?: number | string };
            message?: string;
          } | null;
          ok = response.ok && body?.success === true && body.data?.balance !== undefined;
          if (ok) {
            status = "authenticated";
            const balance = Number(body?.data?.balance);
            message = Number.isFinite(balance)
              ? `Bigisub token verified. Provider wallet balance: ₦${balance.toLocaleString("en-NG")}.`
              : "Bigisub token verified and wallet endpoint responded.";
          } else {
            message = `Bigisub check failed (HTTP ${response.status}). Verify the token and API access.`;
          }
        } catch {
          message = "Bigisub wallet check could not be completed.";
        }
      }
    } else {
      message = "This provider has no implemented connection.";
    }

    const now = new Date().toISOString();
    await context.supabase.from("vtu_providers").update({
      connection_status: status,
      last_checked_at: now,
      last_error: ok ? null : message,
      ...(ok ? { last_authenticated_at: now, enabled: true, airtime_enabled: provider?.adapter === "bigisub" } : {}),
    }).eq("id", data.id);

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
  .inputValidator((input) => z.object({
    networkId: z.number().int().positive(),
    networkName: z.string().min(1),
    phone: z.string().min(10).max(15),
    amountNaira: z.number().int().min(50).max(10000)
  }).parse(input))
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!/^0\d{10}$/.test(phone)) throw new Error("Invalid Nigerian phone number. Example: 08012345678");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: mappings, error: mappingError } = await supabaseAdmin
      .from("vtu_products")
      .select("id, provider_id, network_id, network_name, min_amount_kobo, max_amount_kobo, vtu_providers!inner(enabled, airtime_enabled, adapter)")
      .eq("service", "airtime")
      .ilike("network_name", data.networkName)
      .eq("active", true)
      .eq("archived", false);

    const eligible = (mappings ?? []).filter((row) => {
      const p = row.vtu_providers as { enabled: boolean; airtime_enabled: boolean; adapter: string; api_token_encrypted: string | null; transaction_pin_encrypted: string | null } | null;
      return p?.enabled && p.airtime_enabled && (p.adapter === "bigisub" || p.adapter === "arewabundle");
    });
    const serviceMapping = eligible.find((row) => (row.vtu_providers as { adapter: string }).adapter === "bigisub")
      ?? eligible.find((row) => (row.vtu_providers as { adapter: string }).adapter === "arewabundle");
    const providerSettings = serviceMapping?.vtu_providers as
      | { enabled: boolean; airtime_enabled: boolean; adapter: string }
      | null;
    const providerCredentials = providerSettings?.adapter === "bigisub" && serviceMapping
      ? await supabaseAdmin.from("vtu_providers").select("*").eq("id", serviceMapping.provider_id).single()
      : null;
    const bigisubSecrets = providerCredentials?.data as unknown as
      | { api_token_encrypted: string | null; transaction_pin_encrypted: string | null }
      | null;

    if (mappingError || !serviceMapping || !providerSettings) {
      throw new Error("Airtime purchases are not enabled for this network yet. Your wallet has not been charged.");
    }
    const amountKobo = data.amountNaira * 100;
    if ((serviceMapping.min_amount_kobo && amountKobo < serviceMapping.min_amount_kobo) ||
        (serviceMapping.max_amount_kobo && amountKobo > serviceMapping.max_amount_kobo)) {
      throw new Error("This amount is outside the provider's configured limits. Your wallet has not been charged.");
    }

    const purchaseRef = `AIR-${crypto.randomUUID()}`;
    const { error: debitError } = await supabaseAdmin.rpc("wallet_post", {
      _user_id: context.userId,
      _category: "purchase",
      _amount_kobo: -amountKobo,
      _reference: purchaseRef,
      _description: `Airtime: ₦${data.amountNaira} to ${phone} (${data.networkName})`,
    });
    if (debitError) throw new Error("Wallet debit failed. No provider request was sent.");

    const refund = async (reason: string) => {
      const { error } = await supabaseAdmin.rpc("wallet_post", {
        _user_id: context.userId,
        _category: "refund",
        _amount_kobo: amountKobo,
        _reference: `refund:${purchaseRef}`,
        _description: `Refund: ${reason}`,
      });
      if (error) throw new Error(`Refund could not be posted automatically. Contact support with reference ${purchaseRef}.`);
    };

    if (providerSettings.adapter === "bigisub") {
      const token = decryptProviderSecret(bigisubSecrets?.api_token_encrypted ?? null);
      const pin = decryptProviderSecret(bigisubSecrets?.transaction_pin_encrypted ?? null);
      if (!token || !pin) {
        await refund("Bigisub credentials missing before request");
        throw new Error("Bigisub is not configured. Wallet debit was reversed.");
      }
      const network = ({ MTN: 1, GLO: 2, Airtel: 3, "9mobile": 4 } as Record<string, number>)[data.networkName];
      if (!network) {
        await refund("Unsupported Bigisub network name");
        throw new Error("Selected network is not supported by Bigisub. Wallet debit was reversed.");
      }
      try {
        const response = await fetch("https://api.bigisub.ng/api/v2/vtu/airtime/purchase/", {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(25000),
          headers: {
            Authorization: `Token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            network,
            phone_number: phone,
            amount: String(data.amountNaira),
            airtime_type: "vtu",
            pin,
          }),
        });
        const body = await response.json().catch(() => null) as {
          success?: boolean;
          data?: { transaction_id?: string; reference?: string; status?: string };
          message?: string;
        } | null;
        if (response.ok && body?.success === true && body.data?.status === "successful") {
          return {
            success: true,
            message: `₦${data.amountNaira} airtime request succeeded for ${phone}. Provider reference: ${body.data.transaction_id ?? body.data.reference ?? "received"}`,
            reference: purchaseRef,
            providerReference: body.data.transaction_id ?? body.data.reference ?? null,
          };
        }
        if (body?.data?.status === "processing") {
          throw new Error(`PENDING: Bigisub transaction is processing. Do not retry. Reference: ${body.data.transaction_id ?? purchaseRef}`);
        }
        if (body?.data?.status === "failed" || (!response.ok && response.status >= 400 && response.status < 500)) {
          await refund(body?.message ?? `Bigisub rejected request (HTTP ${response.status})`);
          throw new Error(`REFUNDED: ${body?.message ?? "Bigisub rejected the airtime request. Wallet debit was reversed."}`);
        }
        throw new Error(`PENDING: Bigisub returned an uncertain result. Do not retry. Reference: ${body?.data?.transaction_id ?? purchaseRef}`);
      } catch (error) {
        if (error instanceof Error && (error.message.startsWith("REFUNDED:") || error.message.startsWith("PENDING:"))) throw error;
        throw new Error(`PENDING: Bigisub response uncertain; wallet not automatically refunded. Do not retry. Reference: ${purchaseRef}`);
      }
    }

    const gatewayKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["UDC_AREWABUNDLE_ACCOUNT_API_KEY"];
    if (!gatewayKey || !connectionKey) {
      await refund("Arewabundle credentials missing before request");
      throw new Error("Arewabundle is not configured. Wallet debit was reversed.");
    }
    try {
      const authRes = await fetch("https://connector-gateway.lovable.dev/udc_arewabundle_account/api/user", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${gatewayKey}`,
          "X-Connection-Api-Key": connectionKey,
          Accept: "application/json",
        },
      });
      const authData = await authRes.json().catch(() => null) as { AccessToken?: string } | null;
      if (!authRes.ok || !authData?.AccessToken) {
        await refund("Arewabundle authentication failed before airtime request");
        throw new Error("REFUNDED: Could not authenticate with Arewabundle. Wallet debit was reversed.");
      }
      const response = await fetch("https://api.arewabundle.com.ng/api/topup", {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: `Token ${authData.AccessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          network: data.networkId,
          phone,
          plan_type: "VTU",
          bypass: false,
          amount: data.amountNaira,
          "request-id": purchaseRef,
        }),
      });
      const body = await response.json().catch(() => null) as { status?: string; message?: string } | null;
      if (response.ok && body?.status === "success") {
        return { success: true, message: `₦${data.amountNaira} airtime request succeeded for ${phone}.`, reference: purchaseRef };
      }
      if (body?.status === "fail") {
        await refund(body.message ?? "Arewabundle reported failure");
        throw new Error(`REFUNDED: ${body.message ?? "Arewabundle failed the request. Wallet debit was reversed."}`);
      }
      throw new Error(`PENDING: Provider response uncertain. Do not retry. Reference: ${purchaseRef}`);
    } catch (error) {
      if (error instanceof Error && (error.message.startsWith("REFUNDED:") || error.message.startsWith("PENDING:"))) throw error;
      throw new Error(`PENDING: Airtime outcome uncertain. Wallet not automatically refunded. Do not retry. Reference: ${purchaseRef}`);
    }
  });

export const purchaseData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    productId: z.string().uuid(),
    phone: z.string().min(10).max(15),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (!/^0\d{10}$/.test(phone)) {
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
