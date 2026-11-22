import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const settingsSchema = z.object({
  enabled: z.boolean(),
  required_referrals: z.number().int().min(1).max(100),
  minimum_funding_kobo: z.number().int().min(50000).max(100000000),
  reward_data_mb: z.number().int().min(100).max(100000),
});

export const getMyReferralDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_referral_dashboard" as never);
    if (error) throw new Error("Could not load referral progress.");
    return data as any;
  });

export const getReferralRewardProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data, error } = await db.from("vtu_products")
      .select("id,network_name,plan_name,service,active,archived,data_plan_id,network_id,vtu_providers!inner(adapter,enabled,data_enabled)")
      .eq("service","data").eq("active",true).eq("archived",false);
    if (error) throw new Error("Could not load reward plans.");
    return (data ?? []).filter((p:any) => /(^|\D)5\s*GB(\D|$)/i.test(p.plan_name) &&
      p.data_plan_id && (p.vtu_providers as any)?.adapter === "arewabundle" &&
      (p.vtu_providers as any)?.enabled && (p.vtu_providers as any)?.data_enabled);
  });

export const claimReferralDataReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    network: z.enum(["MTN","Airtel","Glo","9mobile"]),
    phone: z.string().regex(/^0[789][01]\d{8}$/),
    productId: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const userDb = context.supabase as any;
    const { data: claimId, error: reserveError } = await userDb.rpc("reserve_referral_reward_claim", {
      _network: data.network, _phone: data.phone, _product_id: data.productId,
    });
    if (reserveError || !claimId) throw new Error(reserveError?.message ?? "Could not reserve reward claim.");

    const claim = String(claimId);
    await db.from("referral_reward_claims").update({ status: "processing" }).eq("id", claim);
    const { data: product, error: productError } = await supabaseAdmin.from("vtu_products")
      .select("id,network_id,network_name,plan_name,data_plan_id,vtu_providers!inner(adapter,enabled,data_enabled)")
      .eq("id",data.productId).single();
    const provider = product?.vtu_providers as any;
    if (productError || !product || !provider || provider.adapter !== "arewabundle" || !provider.enabled || !provider.data_enabled || !product.data_plan_id) {
      await db.from("referral_reward_claims").update({ status:"failed", failure_reason:"Reward plan/provider is unavailable" }).eq("id",claim);
      throw new Error("Reward delivery is unavailable for this plan. Your unlocked reward remains available for support.");
    }
    const gatewayKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["UDC_AREWABUNDLE_ACCOUNT_API_KEY"];
    if (!gatewayKey || !connectionKey) {
      await db.from("referral_reward_claims").update({ status:"failed", failure_reason:"Provider credentials unavailable" }).eq("id",claim);
      throw new Error("Provider connection unavailable. Your reward was not consumed.");
    }
    const reference = "REF-" + claim;
    try {
      const authResponse = await fetch("https://connector-gateway.lovable.dev/udc_arewabundle_account/api/user", {
        method:"POST", redirect:"error", signal:AbortSignal.timeout(15000),
        headers:{Authorization:"Bearer "+gatewayKey,"X-Connection-Api-Key":connectionKey,Accept:"application/json"},
      });
      const authBody = await authResponse.json().catch(()=>null) as any;
      if (!authResponse.ok || !authBody?.AccessToken) {
        await db.from("referral_reward_claims").update({status:"failed",failure_reason:"Provider authentication failed"}).eq("id",claim);
        throw new Error("Provider authentication failed. Your reward remains available.");
      }
      const response=await fetch("https://api.arewabundle.com.ng/api/data",{
        method:"POST",redirect:"error",signal:AbortSignal.timeout(25000),
        headers:{Authorization:"Token "+authBody.AccessToken,"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify({network:product.network_id,phone:data.phone,data_plan:product.data_plan_id,bypass:false,"request-id":reference}),
      });
      const body=await response.json().catch(()=>null) as any;
      if(response.ok && body?.status==="success"){
        await db.from("referral_reward_claims").update({status:"delivered",provider_reference:reference,delivered_at:new Date().toISOString(),failure_reason:null}).eq("id",claim);
        await db.from("referral_audit").insert({actor_id:context.userId,event:"reward_data_delivered",subject_user_id:context.userId,details:{claim_id:claim,network:data.network,phone_last4:data.phone.slice(-4),provider_reference:reference}});
        return {success:true,status:"delivered",claimId:claim,message:"Your 5GB reward delivery request succeeded. Confirm receipt on the recipient phone."};
      }
      if(body?.status==="fail"){
        await db.from("referral_reward_claims").update({status:"failed",failure_reason:String(body.message??"Provider reported failure").slice(0,500),provider_reference:reference}).eq("id",claim);
        return {success:false,status:"failed",claimId:claim,message:"Provider reported failure. Your reward remains available for support/retry."};
      }
      await db.from("referral_reward_claims").update({status:"pending",failure_reason:"Provider response ambiguous; do not retry automatically",provider_reference:reference}).eq("id",claim);
      return {success:false,status:"pending",claimId:claim,message:"Delivery status is uncertain. Please do not claim again; contact support with the claim reference."};
    } catch(e) {
      const msg=e instanceof Error?e.message:"Provider response uncertain";
      if(!msg.includes("Provider authentication failed")) await db.from("referral_reward_claims").update({status:"pending",failure_reason:"Network/provider response uncertain",provider_reference:reference}).eq("id",claim);
      throw new Error(msg.includes("reward remains available")?msg:"Provider response is uncertain. Do not retry yet; contact support with claim "+claim);
    }
  });

export const getAdminReferralData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", {_user_id:context.userId,_role:"admin"});
    if(roleError || !admin) throw new Error("Administrator permission required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const [settings, deposits, qualifications, claims, referrals, profiles] = await Promise.all([
      db.from("referral_reward_settings").select("*").eq("id",true).single(),
      db.from("wallet_transactions").select("id,user_id,amount_kobo,reference,description,created_at").eq("category","deposit").gte("amount_kobo",50000).order("created_at",{ascending:false}).limit(100),
      db.from("referral_qualifications").select("id,referred_user_id,referrer_user_id,qualifying_amount_kobo,verified_at").order("verified_at",{ascending:false}).limit(100),
      db.from("referral_reward_claims").select("*").order("created_at",{ascending:false}).limit(100),
      db.from("profiles").select("id,full_name,email,invite_code,referred_by,created_at").not("referred_by","is",null).order("created_at",{ascending:false}).limit(200),
      db.from("profiles").select("id,full_name,email,phone").limit(2000),
    ]);
    if(settings.error) throw new Error("Could not load referral settings.");
    return {settings:settings.data,deposits:deposits.data??[],qualifications:qualifications.data??[],claims:claims.data??[],referrals:referrals.data??[],profiles:profiles.data??[]};
  });

export const saveReferralSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input)=>settingsSchema.parse(input))
  .handler(async ({data,context})=>{
    const userDb = context.supabase as any;
    const {data:admin,error:roleError}=await userDb.rpc("has_role",{_user_id:context.userId,_role:"admin"});
    if(roleError||!admin)throw new Error("Administrator permission required.");
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const {error}=await db.from("referral_reward_settings").update({...data,updated_by:context.userId,updated_at:new Date().toISOString()}).eq("id",true);
    if(error)throw new Error("Could not save referral settings.");
    await db.from("referral_audit").insert({actor_id:context.userId,event:"referral_settings_updated",details:data});
    return {success:true};
  });

export const verifyReferralDeposit = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((input)=>z.object({transactionId:z.string().uuid(),note:z.string().max(500).optional()}).parse(input))
  .handler(async ({data,context})=>{
    const userDb = context.supabase as any;
    const {data:admin,error:roleError}=await userDb.rpc("has_role",{_user_id:context.userId,_role:"admin"});
    if(roleError||!admin)throw new Error("Administrator permission required.");
    const {data:result,error}=await userDb.rpc("admin_verify_referral_deposit",{_transaction_id:data.transactionId,_note:data.note??""});
    if(error)throw new Error(error.message);
    return result;
  });
