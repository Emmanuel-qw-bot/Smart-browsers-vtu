import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const storeSchema=z.object({
  store_name:z.string().trim().min(2).max(80),
  slug:z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,39}$/),
  tagline:z.string().max(140).default(""),
  whatsapp_phone:z.string().max(30).default(""),
  pickup_delivery_note:z.string().max(500).default(""),
});
const productSchema=z.object({
  id:z.string().uuid().optional(),
  title:z.string().trim().min(1).max(120),
  description:z.string().max(1000).default(""),
  category:z.string().max(60).default("Other"),
  state:z.string().min(1).max(40),
  price_kobo:z.number().int().positive().max(100000000),
  stock_quantity:z.number().int().nonnegative().nullable().default(null),
  image_url:z.string().url().max(2000).nullable().optional(),
  is_available:z.boolean().default(true),
});
const receiptSchema=z.object({
  customer_name:z.string().max(100).default(""),
  customer_phone:z.string().max(30).default(""),
  note:z.string().max(300).default(""),
  payment_status:z.enum(["paid","unpaid"]),
  items:z.array(z.object({product_id:z.string().uuid(),quantity:z.number().int().min(1).max(1000)})).min(1).max(50),
});

export const getMyMiniShop=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const db=context.supabase as any;
  const {data:store,error}=await db.from("vendor_stores").select("*").eq("owner_id",context.userId).maybeSingle();
  if(error)throw new Error("Could not load your Mini Shop.");
  if(!store)return {store:null,products:[],receipts:[]};
  const [products,receipts]=await Promise.all([
    db.from("vendor_products").select("*").eq("owner_id",context.userId).order("created_at",{ascending:false}),
    db.from("vendor_receipts").select("*").eq("owner_id",context.userId).order("created_at",{ascending:false}).limit(30),
  ]);
  if(products.error||receipts.error)throw new Error("Could not load your shop products or receipts.");
  return {store,products:products.data??[],receipts:receipts.data??[]};
});

export const saveMiniShopStore=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input)=>storeSchema.parse(input)).handler(async({data,context})=>{
  const db=context.supabase as any;
  const {data:existing}=await db.from("vendor_stores").select("id").eq("owner_id",context.userId).maybeSingle();
  const payload={...data,owner_id:context.userId,updated_at:new Date().toISOString()};
  const {data:store,error}=await db.from("vendor_stores").upsert(payload,{onConflict:"owner_id"}).select("*").single();
  if(error){
    if(error.code==="23505")throw new Error("That shop link is already taken. Try another name.");
    throw new Error("Could not save your shop profile.");
  }
  return store;
});

export const saveMiniShopProduct=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input)=>productSchema.parse(input)).handler(async({data,context})=>{
  const db=context.supabase as any;
  const {data:store,error:storeError}=await db.from("vendor_stores").select("id").eq("owner_id",context.userId).single();
  if(storeError||!store)throw new Error("Set up your shop profile before adding products.");
  const payload={...data,owner_id:context.userId,store_id:store.id,updated_at:new Date().toISOString()};
  const query=data.id?db.from("vendor_products").update(payload).eq("id",data.id).eq("owner_id",context.userId):db.from("vendor_products").insert(payload);
  const {error}=await query;
  if(error)throw new Error("Could not save this product.");
  return {success:true};
});

export const deleteMiniShopProduct=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input)=>z.object({id:z.string().uuid()}).parse(input)).handler(async({data,context})=>{
  const db=context.supabase as any;
  const {error}=await db.from("vendor_products").delete().eq("id",data.id).eq("owner_id",context.userId);
  if(error)throw new Error("Could not delete this product.");
  return {success:true};
});

export const issueMiniShopReceipt=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((input)=>receiptSchema.parse(input)).handler(async({data,context})=>{
  const db=context.supabase as any;
  const {data:store,error:storeError}=await db.from("vendor_stores").select("id,store_name").eq("owner_id",context.userId).single();
  if(storeError||!store)throw new Error("Set up your shop profile before issuing receipts.");
  const ids=[...new Set(data.items.map(i=>i.product_id))];
  const {data:products,error}=await db.from("vendor_products").select("id,title,price_kobo").eq("owner_id",context.userId).eq("store_id",store.id).in("id",ids);
  if(error||!products||products.length!==ids.length)throw new Error("One or more selected products are unavailable.");
  const snapshot=data.items.map(item=>{
    const product=products.find((p:any)=>p.id===item.product_id);
    if(!product)throw new Error("A selected product could not be found.");
    return {product_id:product.id,title:product.title,unit_price_kobo:product.price_kobo,quantity:item.quantity,line_total_kobo:product.price_kobo*item.quantity};
  });
  const total=snapshot.reduce((sum,item)=>sum+item.line_total_kobo,0);
  if(!Number.isSafeInteger(total)||total<=0)throw new Error("Receipt total is invalid.");
  const {data:receipt,error:insertError}=await db.from("vendor_receipts").insert({
    store_id:store.id,owner_id:context.userId,customer_name:data.customer_name,customer_phone:data.customer_phone,
    items:snapshot,subtotal_kobo:total,payment_status:data.payment_status,
    payment_confirmation:data.payment_status==="paid"?"seller_confirmed":"not_confirmed",note:data.note,
  }).select("*").single();
  if(insertError||!receipt)throw new Error("Receipt could not be saved. Please try again.");
  return {receipt,store_name:store.store_name};
});
