import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const announcementInput = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(1200),
  published: z.boolean(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
});
export const getAnnouncements = createServerFn({ method: "GET" })
 .middleware([requireSupabaseAuth])
 .handler(async ({context}) => {
   const {data,error}=await context.supabase.from("site_announcements").select("*").order("created_at",{ascending:false}).limit(50);
   if(error) throw new Error("Could not load announcements.");
   return data;
 });
export const saveAnnouncement = createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .inputValidator(input=>announcementInput.parse(input))
 .handler(async({data,context})=>{
   const {data:isAdmin,error:roleError}=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
   if(roleError||!isAdmin) throw new Error("Administrator permission required.");
   const {error}=await context.supabase.from("site_announcements").insert({...data,created_by:context.userId});
   if(error) throw new Error("Could not publish announcement.");
   return {success:true};
 });
export const deleteAnnouncement = createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .inputValidator(input=>z.object({id:z.string().uuid()}).parse(input))
 .handler(async({data,context})=>{
   const {data:isAdmin,error:roleError}=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
   if(roleError||!isAdmin) throw new Error("Administrator permission required.");
   const {error}=await context.supabase.from("site_announcements").delete().eq("id",data.id);
   if(error) throw new Error("Could not delete announcement.");
   return {success:true};
 });
export const getCustomerAnnouncements = createServerFn({method:"GET"})
 .middleware([requireSupabaseAuth])
 .handler(async({context})=>{
   const {data,error}=await context.supabase.from("site_announcements").select("id,title,message,created_at").eq("published",true).order("created_at",{ascending:false}).limit(5);
   if(error) throw new Error("Could not load announcements.");
   return data;
 });
