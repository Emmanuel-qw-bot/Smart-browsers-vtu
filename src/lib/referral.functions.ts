import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const settingsSchema = z.object({
  enabled: z.boolean(),
  required_referrals: z.number().int().min(1).max(100),
  minimum_funding_kobo: z.number().int().min(50000).max(100000000),
  reward_data_mb: z.number().int().min(1000).max(100000).multipleOf(1000),
  mtn_network_id:z.string().max(100),mtn_data_plan_id:z.string().max(100),
  airtel_network_id:z.string().max(100),airtel_data_plan_id:z.string().max(100),
  glo_network_id:z.string().max(100),glo_data_plan_id:z.string().max(100),
});

export const getMyReferralDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userDb = context.supabase as any;
    const { data, error } = await userDb.rpc("get_my_referral_dashboard");
    if (error) throw new Error("Could not load referral progress.");
    return data as any;
  });

export const getReferralRewardProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data,error}=await supabaseAdmin.from("referral_reward_settings").select("mtn_network_id,mtn_data_plan_id,airtel_network_id,airtel_data_plan_id,glo_network_id,glo_data_plan_id").eq("id",true).single();
    if(error||!data)throw new Error("Could not load configured reward networks.");
    return [
      {network:"MTN",configured:!!data.mtn_network_id&&!!data.mtn_data_plan_id},
      {network:"Airtel",configured:!!data.airtel_network_id&&!!data.airtel_data_plan_id},
      {network:"Glo",configured:!!data.glo_network_id&&!!data.glo_data_plan_id},
    ];
  });

export const claimReferralDataReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input)=>z.object({
    network:z.enum(["MTN","Airtel","Glo"]).optional(),
    phone:z.string().regex(/^0[789][01]\\d{8}$/).optional(),
    retryClaimId:z.string().uuid().optional(),
  }).parse(input))
  .handler(async({data,context})=>{
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const db=supabaseAdmin as any;const userDb=context.supabase as any;
    const {data:claimId,error:reserveError}=data.retryClaimId
      ? await userDb.rpc("retry_referral_reward_claim",{_claim_id:data.retryClaimId})
      : await userDb.rpc("reserve_referral_reward_claim",{_network:data.network,_phone:data.phone,_product_id:null});
    if(reserveError||!claimId)throw new Error(reserveError?.message??"Could not reserve your referral reward.");
    const claim=String(claimId);
    const {data:row,error:rowError}=await db.from("referral_reward_claims").select("referrer_user_id,network,recipient_phone,network_id,data_plan_id,status").eq("id",claim).single();
    if(rowError||!row||row.referrer_user_id!==context.userId)throw new Error("Could not verify the reward claim.");
    if(!row.network_id||!row.data_plan_id)throw new Error("Reward network mapping is missing. Contact support.");
    // Compare-and-set prevents two requests from sending the same reserved claim.
    const {data:reserved,error:casError}=await db.from("referral_reward_claims").update({status:"processing",provider_reference:"REF-"+claim,updated_at:new Date().toISOString()}).eq("id",claim).eq("status","reserved").select("id").maybeSingle();
    if(casError||!reserved)throw new Error("This reward claim is already processing or awaiting reconciliation. Do not submit it again.");
    const reference="REF-"+claim;
    const gatewayKey=process.env["LOVABLE_API_KEY"],connectionKey=process.env["UDC_AREWABUNDLE_ACCOUNT_API_KEY"];
    if(!gatewayKey||!connectionKey){
      await db.from("referral_reward_claims").update({status:"failed",failure_reason:"Provider credentials unavailable before delivery"}).eq("id",claim);
      throw new Error("Provider connection unavailable. The reward remains available.");
    }
    let sent=false;
    try{
      const auth=await fetch("https://connector-gateway.lovable.dev/udc_arewabundle_account/api/user",{method:"POST",redirect:"error",signal:AbortSignal.timeout(15000),headers:{Authorization:"Bearer "+gatewayKey,"X-Connection-Api-Key":connectionKey,Accept:"application/json"}});
      const authBody=await auth.json().catch(()=>null) as any;
      if(!auth.ok||!authBody?.AccessToken){
        await db.from("referral_reward_claims").update({status:"failed",failure_reason:"Provider authentication failed before data request"}).eq("id",claim);
        throw new Error("Provider authentication failed. The reward has not been sent.");
      }
      sent=true;
      const response=await fetch("https://api.arewabundle.com.ng/api/data",{method:"POST",redirect:"error",signal:AbortSignal.timeout(25000),headers:{Authorization:"Token "+authBody.AccessToken,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({network:/^\\d+$/.test(row.network_id)?Number(row.network_id):row.network_id,phone:row.recipient_phone,data_plan:/^\\d+$/.test(row.data_plan_id)?Number(row.data_plan_id):row.data_plan_id,bypass:false,"request-id":reference})});
      const body=await response.json().catch(()=>null) as any;
      if(response.ok&&body?.status==="success"){
        const {error:finalizeError}=await db.from("referral_reward_claims").update({status:"delivered",provider_reference:reference,delivered_at:new Date().toISOString(),failure_reason:null,updated_at:new Date().toISOString()}).eq("id",claim);
        if(finalizeError){await db.from("referral_reward_claims").update({status:"pending",failure_reason:"Provider confirmed success but claim finalization failed; support reconciliation required",updated_at:new Date().toISOString()}).eq("id",claim);return {success:false,status:"pending",claimId:claim,message:"Provider confirmed delivery, but the claim could not be finalized. Contact support; do not retry."};}
        await db.from("referral_audit").insert({actor_id:context.userId,event:"reward_data_delivered",subject_user_id:context.userId,details:{claim_id:claim,network:row.network,phone_last4:row.recipient_phone.slice(-4),provider_reference:reference}});
        return {success:true,status:"delivered",claimId:claim,message:"Congratulations! Your referral data reward was successfully sent. Check the recipient phone."};
      }
      if(body?.status==="fail"){
        await db.from("referral_reward_claims").update({status:"failed",failure_reason:String(body.message??"Provider confirmed failure").slice(0,500),updated_at:new Date().toISOString()}).eq("id",claim);
        return {success:false,status:"failed",claimId:claim,message:"The provider confirmed delivery failed. Your reward claim is retained; contact support before retrying."};
      }
      await db.from("referral_reward_claims").update({status:"pending",failure_reason:"Provider outcome ambiguous. Do not retry until reconciled.",updated_at:new Date().toISOString()}).eq("id",claim);
      return {success:false,status:"pending",claimId:claim,message:"Delivery status is uncertain. Do not retry. Contact support with claim reference "+claim};
    }catch(error){
      const msg=error instanceof Error?error.message:"Provider error";
      if(!sent)await db.from("referral_reward_claims").update({status:"failed",failure_reason:"Request not sent: "+msg.slice(0,300),updated_at:new Date().toISOString()}).eq("id",claim);
      else await db.from("referral_reward_claims").update({status:"pending",failure_reason:"Provider response uncertain. Do not retry.",updated_at:new Date().toISOString()}).eq("id",claim);
      throw new Error(sent?"Provider outcome uncertain. Do not retry. Contact support with claim reference "+claim:msg);
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
      db.from("referral_qualifications").select("id,referred_user_id,referrer_user_id,qualifying_wallet_transaction_id,qualifying_amount_kobo,verified_at").order("verified_at",{ascending:false}).limit(100),
      db.from("referral_reward_claims").select("*").order("created_at",{ascending:false}).limit(100),
      db.from("profiles").select("id,full_name,email,invite_code,referred_by,created_at").not("referred_by","is",null).order("created_at",{ascending:false}).limit(200),
      db.from("profiles").select("id,full_name,username,email,phone").limit(2000),
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

export const resolveReferralRewardClaim = createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator((input)=>z.object({claimId:z.string().uuid(),status:z.enum(["delivered","failed"]),note:z.string().max(500).optional()}).parse(input))
  .handler(async ({data,context})=>{
    const userDb=context.supabase as any;
    const {data:admin,error:roleError}=await userDb.rpc("has_role",{_user_id:context.userId,_role:"admin"});
    if(roleError||!admin)throw new Error("Administrator permission required.");
    const {data:ok,error}=await userDb.rpc("admin_resolve_referral_reward_claim",{_claim_id:data.claimId,_status:data.status,_note:data.note??""});
    if(error)throw new Error(error.message);
    return {success:!!ok};
  });
