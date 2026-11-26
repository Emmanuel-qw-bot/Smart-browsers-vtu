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
                                      context.supabase.from("vtu_providers").select("id, name, adapter, enabled, data_enabled, airtime_enabled, connection_status, last_authenticated_at, last_checked_at, last_error, created_at").order("created_at"),
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
    const canonicalNetwork = values.service === "airtime"
      ? normalizeAirtimeNetworkName(values.network_name)
      : values.network_name.trim();
    const normalizedValues = {
      ...values,
      network_name: canonicalNetwork,
      ...(values.service === "airtime"
        ? { network_id: BIGISUB_AIRTIME_NETWORK_IDS[canonicalNetwork.toUpperCase()] ?? values.network_id }
        : {}),
    };
    if (values.service === "airtime") {
      const duplicateQuery = context.supabase.from("vtu_products")
        .select("id").eq("provider_id", values.provider_id).eq("service", "airtime")
        .eq("network_name", canonicalNetwork).eq("archived", false);
      const duplicate = id ? await duplicateQuery.neq("id", id).maybeSingle() : await duplicateQuery.maybeSingle();
      if (duplicate.error) throw new Error("Could not verify duplicate airtime network mappings.");
      if (duplicate.data) throw new Error(`An airtime mapping for ${canonicalNetwork} already exists. Edit the existing mapping instead.`);
    }
    const result = id
      ? await context.supabase.from("vtu_products").update(normalizedValues).eq("id", id).select("id").single()
      : await context.supabase.from("vtu_products").insert(normalizedValues).select("id").single();
    if (result.error) throw new Error(result.error.message || "Could not save this mapping.");
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
          const body = (await response.json().catch(() => null)) as {
            AccessToken?: string;
            balance?: string | number;
            username?: string;
          } | null;
          ok = response.ok && hasAccessToken(body);
          if (ok) {
            status = "authenticated";
            const balance = Number(body?.balance);
            message = Number.isFinite(balance)
              ? `Arewabundle account verified (${body?.username ?? "account"}). Provider wallet balance: ₦${balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}.`
              : "Arewabundle account verified and access token received.";
          } else {
            message = `Authentication failed (HTTP ${response.status}).`;
          }
        } catch {
          message = "Arewabundle authentication could not be completed.";
        }
      }
    } else if (provider?.adapter === "bigisub") {
      const token = decryptProviderSecret((provider as unknown as { api_token_encrypted?: string | null } | null)?.api_token_encrypted ?? null);
      if (token) {
        status = "error";
        try {
          const response = await fetch("https://api.bigisub.ng/api/v2/financial/wallet/balance/", {
            method: "GET",
            redirect: "manual",
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
            const safeDetail = typeof body?.message === "string" ? body.message.slice(0, 180) : "";
            message = `Bigisub wallet check failed (HTTP ${response.status})${safeDetail ? `: ${safeDetail}` : ""}. Check token validity and Bigisub API access.`;
          }
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          const safeDetail = detail.replace(/token[^\s]*/gi, "[redacted]").slice(0, 180);
          message = `Bigisub wallet check could not complete: ${safeDetail || "Unknown connection error"}.`;
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
      ...(ok ? {
        last_authenticated_at: now,
        enabled: true,
        airtime_enabled: provider?.adapter === "bigisub",
        data_enabled: provider?.adapter === "arewabundle",
      } : {}),
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
const BIGISUB_AIRTIME_NETWORK_IDS: Record<string, number> = { MTN: 1, GLO: 2, AIRTEL: 3, "9MOBILE": 4 };
function normalizeAirtimeNetworkName(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (cleaned === "9MOBILE" || cleaned === "9MOB" || cleaned === "ETISALAT") return "9mobile";
  if (cleaned === "GLO") return "Glo";
  if (cleaned === "AIRTEL") return "Airtel";
  if (cleaned === "MTN") return "MTN";
  return raw.trim();
}
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
      .eq("network_name", normalizeAirtimeNetworkName(data.networkName))
      .eq("active", true)
      .eq("archived", false);

    // An active airtime mapping is the admin's explicit approval for that network.
    // Bigisub credentials are saved separately; don't require a successful wallet
    // connection test to allow a mapped purchase attempt (the test endpoint may fail
    // even when the provider's purchase endpoint works).
    const eligible = (mappings ?? []).filter((row) => {
      const p = row.vtu_providers as { enabled: boolean; airtime_enabled: boolean; adapter: string } | null;
      return p?.adapter === "bigisub" || (p?.enabled && p.airtime_enabled && p.adapter === "arewabundle");
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
      const pendingInsert = await supabaseAdmin.from("bigisub_airtime_pending").insert({
        reference: purchaseRef, user_id: context.userId, network_name: data.networkName,
        phone, amount_naira: data.amountNaira, status: "pending",
      });
      if (pendingInsert.error) {
        await refund("Could not create pending transaction tracking record before provider request");
        throw new Error("Transaction tracking could not be initialized. Wallet debit was reversed; no provider request was sent.");
      }
      const token = decryptProviderSecret(bigisubSecrets?.api_token_encrypted ?? null);
      const pin = decryptProviderSecret(bigisubSecrets?.transaction_pin_encrypted ?? null);
      if (!token || !pin) {
        await refund("Bigisub credentials missing before request");
        throw new Error("Bigisub is not configured. Wallet debit was reversed.");
      }
      const network = BIGISUB_AIRTIME_NETWORK_IDS[normalizeAirtimeNetworkName(data.networkName).toUpperCase()];
      if (!network) {
        await refund("Unsupported Bigisub network name");
        throw new Error("Selected network is not supported by Bigisub. Wallet debit was reversed.");
      }
      try {
        const response = await fetch("https://api.bigisub.ng/api/v2/vtu/airtime/purchase/", {
          method: "POST",
          redirect: "manual",
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
        const providerTxnId = body?.data?.transaction_id ?? body?.data?.reference ?? null;
        if (providerTxnId) {
          await supabaseAdmin.from("bigisub_airtime_pending").update({
            provider_transaction_id: providerTxnId,
            provider_message: body?.message ?? null,
          }).eq("reference", purchaseRef);
        }
        if (response.ok && body?.success === true && body.data?.status === "successful") {
          await supabaseAdmin.from("bigisub_airtime_pending").update({ status: "successful", last_checked_at: new Date().toISOString(), provider_message: body?.message ?? "Purchase successful" }).eq("reference", purchaseRef);
          return {
            success: true,
            message: `₦${data.amountNaira} airtime request succeeded for ${phone}. Provider reference: ${providerTxnId ?? "received"}`,
            reference: purchaseRef,
            providerReference: providerTxnId,
          };
        }
        if (body?.data?.status === "processing") {
          await supabaseAdmin.from("bigisub_airtime_pending").update({ status: "pending", last_checked_at: new Date().toISOString(), provider_message: body?.message ?? "Provider reports processing" }).eq("reference", purchaseRef);
          throw new Error(`PENDING: Bigisub transaction is processing. Do not retry. Reference: ${providerTxnId ?? purchaseRef}`);
        }
        if (body?.data?.status === "failed" || (!response.ok && response.status >= 400 && response.status < 500)) {
          await refund(body?.message ?? `Bigisub rejected request (HTTP ${response.status})`);
          await supabaseAdmin.from("bigisub_airtime_pending").update({ status: "refunded", last_checked_at: new Date().toISOString(), provider_message: body?.message ?? "Provider rejected; wallet refunded" }).eq("reference", purchaseRef);
          throw new Error(`REFUNDED: ${body?.message ?? "Bigisub rejected the airtime request. Wallet debit was reversed."}`);
        }
        await supabaseAdmin.from("bigisub_airtime_pending").update({ status: "uncertain", last_checked_at: new Date().toISOString(), provider_message: body?.message ?? `Uncertain response HTTP ${response.status}` }).eq("reference", purchaseRef);
        throw new Error(`PENDING: Bigisub returned an uncertain result. Do not retry. Reference: ${providerTxnId ?? purchaseRef}`);
      } catch (error) {
        if (error instanceof Error && (error.message.startsWith("REFUNDED:") || error.message.startsWith("PENDING:"))) throw error;
        await supabaseAdmin.from("bigisub_airtime_pending").update({ status: "uncertain", last_checked_at: new Date().toISOString(), provider_message: error instanceof Error ? error.message.slice(0, 300) : "Request outcome uncertain; no provider transaction ID returned" }).eq("reference", purchaseRef);
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

export const getPendingBigisubAirtime = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Administrator permission required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error: listError } = await supabaseAdmin.from("bigisub_airtime_pending")
      .select("reference,user_id,provider_transaction_id,network_name,phone,amount_naira,status,provider_message,created_at,last_checked_at")
      .in("status", ["pending", "uncertain"]).order("created_at", { ascending: false }).limit(100);
    if (listError) throw new Error("Could not load pending Bigisub airtime transactions.");
    return data ?? [];
  });

export const registerPendingFromWalletReference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(8).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Administrator permission required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: ledger, error: ledgerError } = await supabaseAdmin.from("wallet_transactions")
      .select("user_id,amount_kobo,description,reference").eq("reference", data.reference).eq("category", "purchase").single();
    if (ledgerError || !ledger) throw new Error("Purchase ledger reference not found.");
    if (!ledger.description.startsWith("Airtime:")) throw new Error("This reference is not an airtime purchase.");
    const phoneMatch = ledger.description.match(/to (0\d{10})/);
    const networkMatch = ledger.description.match(/\(([^)]+)\)$/);
    if (!phoneMatch || !networkMatch) throw new Error("Could not read recipient/network from ledger description.");
    const { error: insertError } = await supabaseAdmin.from("bigisub_airtime_pending").upsert({
      reference: ledger.reference, user_id: ledger.user_id, network_name: networkMatch[1], phone: phoneMatch[1],
      amount_naira: Math.abs(Number(ledger.amount_kobo)) / 100, status: "uncertain",
      provider_message: "Imported older pending transaction. Add provider transaction ID to reconcile.",
    }, { onConflict: "reference", ignoreDuplicates: true });
    if (insertError) throw new Error("Could not register pending transaction.");
    return { ok: true };
  });

export const attachBigisubTransactionId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(1), providerTransactionId: z.string().min(2).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Administrator permission required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updateError } = await supabaseAdmin.from("bigisub_airtime_pending")
      .update({ provider_transaction_id: data.providerTransactionId.trim(), status: "pending", provider_message: "Provider transaction ID added for reconciliation" })
      .eq("reference", data.reference).in("status", ["pending", "uncertain"]);
    if (updateError) throw new Error("Could not save Bigisub transaction ID.");
    return { ok: true };
  });

export const requeryBigisubAirtime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ reference: z.string().min(1), confirmMatch: z.literal(true) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !admin) throw new Error("Administrator permission required.");
    if (data.confirmMatch !== true) throw new Error("Verify the provider transaction recipient and amount before rechecking.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pending, error: pendingError } = await supabaseAdmin.from("bigisub_airtime_pending")
      .select("*").eq("reference", data.reference).single();
    if (pendingError || !pending) throw new Error("Pending transaction not found.");
    if (!pending.provider_transaction_id) throw new Error("Add the provider's transaction ID from Bigisub transaction history before rechecking.");
    if (pending.status === "successful" || pending.status === "refunded") return { status: pending.status, message: "This transaction is already resolved." };
    if (pending.last_checked_at && Date.now() - new Date(pending.last_checked_at).getTime() < 30000) {
      throw new Error("Please wait at least 30 seconds between provider status checks.");
    }
    const { data: provider } = await supabaseAdmin.from("vtu_providers").select("api_token_encrypted")
      .eq("adapter", "bigisub").maybeSingle();
    const token = decryptProviderSecret(provider?.api_token_encrypted ?? null);
    if (!token) throw new Error("Bigisub API token is unavailable.");
    const response = await fetch(`https://api.bigisub.ng/api/v2/anubis/transactions/${encodeURIComponent(pending.provider_transaction_id)}/requery/`, {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Token ${token}`, Accept: "application/json" },
    });
    const body = await response.json().catch(() => null) as { success?: boolean; data?: { new_status?: string; status?: string; message?: string }; message?: string } | null;
    if (!response.ok || body?.success !== true) throw new Error(body?.message ?? `Bigisub requery failed (HTTP ${response.status}).`);
    const status = body.data?.new_status ?? body.data?.status ?? "";
    const message = body.data?.message ?? body.message ?? "Status checked.";
    const now = new Date().toISOString();
    if (status === "successful") {
      await supabaseAdmin.from("bigisub_airtime_pending").update({ status: "successful", last_checked_at: now, provider_message: message }).eq("reference", data.reference);
      return { status, message };
    }
    if (status === "failed") {
      const { error: refundError } = await supabaseAdmin.rpc("wallet_post", {
        _user_id: pending.user_id, _category: "refund", _amount_kobo: pending.amount_naira * 100,
        _reference: `refund:${pending.reference}`, _description: `Refund confirmed failed Bigisub airtime ${pending.reference}`,
      });
      if (refundError) throw new Error("Bigisub confirmed failure, but the customer refund could not be posted. Contact support immediately.");
      await supabaseAdmin.from("bigisub_airtime_pending").update({ status: "refunded", last_checked_at: now, provider_message: `${message} Customer wallet refund posted.` }).eq("reference", data.reference);
      return { status: "refunded", message: `${message} Customer wallet refunded.` };
    }
    await supabaseAdmin.from("bigisub_airtime_pending").update({ status: "pending", last_checked_at: now, provider_message: message }).eq("reference", data.reference);
    return { status: "pending", message: message || "Still processing. Wait before checking again." };
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
