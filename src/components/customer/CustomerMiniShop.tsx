import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Store, Package, ReceiptText, Plus, Trash2, Pencil, Share2, Loader2, CheckCircle2, Search, ShoppingBag, MapPin, ArrowLeft, MessageCircle, Tag, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyMiniShop, saveMiniShopStore, saveMiniShopProduct, deleteMiniShopProduct, issueMiniShopReceipt } from "@/lib/mini-shop.functions";

type Product={id:string;title:string;description:string;category:string;state:string;price_kobo:number;stock_quantity:number|null;image_url:string|null;is_available:boolean};
type MarketProduct=Product & {vendor_stores?:{store_name:string;slug:string;whatsapp_phone:string;pickup_delivery_note:string}|null};
const NIGERIAN_STATES=["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT Abuja","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
const PRODUCT_CATEGORIES=["Fashion & Clothing","Electronics & Gadgets","Phones & Accessories","Beauty & Personal Care","Home & Kitchen Appliances","Food & Drinks","Books & Stationery","Shoes & Bags","Jewellery & Accessories","Baby & Kids","Sports & Fitness","Services","Other"];
type StoreProfile={id:string;store_name:string;slug:string;tagline:string;whatsapp_phone:string;pickup_delivery_note:string};
type Receipt={id:string;receipt_number:string;customer_name:string;customer_phone:string;items:any[];subtotal_kobo:number;payment_status:"paid"|"unpaid";created_at:string;note:string};
const money=(k:number)=>`₦${(k/100).toLocaleString("en-NG",{maximumFractionDigits:2})}`;
const slugify=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40);

export function CustomerMiniShop(){
  const qc=useQueryClient();
  const q=useQuery({queryKey:["mini-shop"],queryFn:()=>getMyMiniShop()});
  const saveStore=useServerFn(saveMiniShopStore);
  const saveProduct=useServerFn(saveMiniShopProduct);
  const removeProduct=useServerFn(deleteMiniShopProduct);
  const createReceipt=useServerFn(issueMiniShopReceipt);
  const [tab,setTab]=useState<"store"|"products"|"receipt"|"history">("store");
  const [section,setSection]=useState<"choose"|"my-shop"|"market">("choose");
  const [marketSearch,setMarketSearch]=useState("");
  const [marketState,setMarketState]=useState("");
  const [marketCategory,setMarketCategory]=useState("");
  const [selectedMarketProduct,setSelectedMarketProduct]=useState<MarketProduct|null>(null);
  const marketQuery=useQuery({queryKey:["mini-shop-market"],queryFn:async()=>{const {data,error}=await supabase.from("vendor_products").select("*,vendor_stores(store_name,slug,whatsapp_phone,pickup_delivery_note)").eq("is_available",true).order("created_at",{ascending:false}).limit(300);if(error)throw error;return (data??[]) as unknown as MarketProduct[];}});
  const [storeForm,setStoreForm]=useState({store_name:"",slug:"",tagline:"",whatsapp_phone:"",pickup_delivery_note:""});
  const [storeTouched,setStoreTouched]=useState(false);
  const [saving,setSaving]=useState(false);
  const [editing,setEditing]=useState<Product|null>(null);
  const [productForm,setProductForm]=useState({title:"",description:"",category:"Other",state:"",price:"",stock:"",image_url:"",is_available:true});
  const [productImage,setProductImage]=useState<File|null>(null);
  const [imagePreview,setImagePreview]=useState("");
  const [customerName,setCustomerName]=useState("");
  const [customerPhone,setCustomerPhone]=useState("");
  const [note,setNote]=useState("");
  const [paymentStatus,setPaymentStatus]=useState<"paid"|"unpaid">("paid");
  const [quantities,setQuantities]=useState<Record<string,number>>({});
  const [busy,setBusy]=useState(false);
  const data=q.data;
  const store=data?.store as StoreProfile|null;
  const products=(data?.products??[]) as Product[];
  const receipts=(data?.receipts??[]) as Receipt[];
  useEffect(()=>{
    if(store&&!storeTouched) setStoreForm({store_name:store.store_name,slug:store.slug,tagline:store.tagline??"",whatsapp_phone:store.whatsapp_phone??"",pickup_delivery_note:store.pickup_delivery_note??""});
  },[store,storeTouched]);
  const chosen=products.filter(p=>(quantities[p.id]??0)>0);
  const total=chosen.reduce((sum,p)=>sum+p.price_kobo*(quantities[p.id]??0),0);

  function syncStoreForm(){
    setStoreForm({store_name:store?.store_name??"",slug:store?.slug??"",tagline:store?.tagline??"",whatsapp_phone:store?.whatsapp_phone??"",pickup_delivery_note:store?.pickup_delivery_note??""});
    setStoreTouched(false);
  }
  async function submitStore(e:React.FormEvent){
    e.preventDefault();setBusy(true);
    try{await saveStore({data:storeForm});toast.success("Shop profile saved.");await qc.invalidateQueries({queryKey:["mini-shop"]});}
    catch(err){toast.error(err instanceof Error?err.message:"Could not save profile.");}
    finally{setBusy(false);}
  }
  function startProduct(p?:Product){
    setEditing(p??null);
    setProductForm(p?{title:p.title,description:p.description,category:p.category,state:p.state??"",price:String(p.price_kobo/100),stock:p.stock_quantity===null?"":String(p.stock_quantity),image_url:p.image_url??"",is_available:p.is_available}:{title:"",description:"",category:"Other",state:"",price:"",stock:"",image_url:"",is_available:true});
    setProductImage(null);setImagePreview(p?.image_url??"");
  }
  async function submitProduct(e:React.FormEvent){
    e.preventDefault();if(!store){toast.error("Save your shop profile first.");return;}
    const naira=Number(productForm.price);
    if(!Number.isFinite(naira)||naira<=0){toast.error("Enter a valid product price.");return;}
    if(!productImage&&!productForm.image_url){toast.error("Please upload a product image.");return;}
    setBusy(true);
    try{
      let imageUrl=productForm.image_url;
      if(productImage){
        const {data:userData}=await supabase.auth.getUser();
        if(!userData.user)throw new Error("Please sign in again before uploading.");
        const ext=productImage.name.split(".").pop()?.toLowerCase()||"jpg";
        const path=`${userData.user.id}/${store.id}/${crypto.randomUUID()}.${ext}`;
        const {error:uploadError}=await supabase.storage.from("mini-shop-product-images").upload(path,productImage,{cacheControl:"3600",upsert:false,contentType:productImage.type});
        if(uploadError)throw new Error("Image upload failed. Check the file and try again.");
        const {data:publicData}=supabase.storage.from("mini-shop-product-images").getPublicUrl(path);
        imageUrl=publicData.publicUrl;
      }
      await saveProduct({data:{...(editing?{id:editing.id}:{}),title:productForm.title,description:productForm.description,category:productForm.category,state:productForm.state,price_kobo:Math.round(naira*100),stock_quantity:productForm.stock.trim()===""?null:Number(productForm.stock),image_url:imageUrl,is_available:productForm.is_available}});
      toast.success(editing?"Product updated.":"Product added.");startProduct();await qc.invalidateQueries({queryKey:["mini-shop"]});
    }catch(err){toast.error(err instanceof Error?err.message:"Could not save product.");}
    finally{setBusy(false);}
  }
  async function deleteProduct(p:Product){
    if(!confirm(`Delete "${p.title}"? This product will no longer appear in your catalogue.`))return;
    try{await removeProduct({data:{id:p.id}});toast.success("Product deleted.");await qc.invalidateQueries({queryKey:["mini-shop"]});}
    catch(err){toast.error(err instanceof Error?err.message:"Could not delete product.");}
  }
  function printLiveReceipt(){
    const node=document.getElementById("mini-shop-receipt-preview");
    if(!node)return;
    const popup=window.open("","_blank","width=500,height=800");
    if(!popup){toast.error("Please allow pop-ups to print your receipt.");return;}
    popup.document.write("<!doctype html><html><head><title>Smart Browsers Receipt</title><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><style>body{font-family:Arial,sans-serif;padding:12px;background:white;color:#111}#paper{max-width:420px;margin:auto;border:1px solid #ddd;padding:16px;position:relative;overflow:hidden}.watermark{opacity:.065}.stamp{border:3px solid #c2410c;color:#c2410c;border-radius:50%;transform:rotate(-12deg)}@media print{body{padding:0}#paper{border:0;box-shadow:none}}</style></head><body><div id=\"paper\">"+node.innerHTML+"</div><script>window.onload=function(){setTimeout(function(){window.print()},250)}<\\/script></body></html>");
    popup.document.close();
  }
  async function makeReceipt(e:React.FormEvent){
    e.preventDefault();if(chosen.length===0){toast.error("Select at least one product.");return;}
    setBusy(true);
    try{
      const result=await createReceipt({data:{customer_name:customerName,customer_phone:customerPhone,note,payment_status:paymentStatus,items:chosen.map(p=>({product_id:p.id,quantity:quantities[p.id]}))}});
      const r=result.receipt;
      const textLines=[`🧾 ${result.store_name} — RECEIPT`,`Receipt: ${r.receipt_number}`,`Date: ${new Date(r.created_at).toLocaleString("en-NG")}`,r.customer_name?`Customer: ${r.customer_name}`:"",...r.items.map((it:any)=>`${it.quantity} × ${it.title} — ${money(it.line_total_kobo)}`),`TOTAL: ${money(r.subtotal_kobo)}`,`Payment: ${r.payment_status==="paid"?"PAID (confirmed by seller)":"UNPAID"}`,r.note?`Note: ${r.note}`:"",`Thank you for your patronage!`].filter(Boolean).join("\n");
      toast.success("Receipt saved.");
      if(r.customer_phone){window.open(`https://wa.me/${r.customer_phone.replace(/\D/g,"")}?text=${encodeURIComponent(textLines)}`,"_blank","noopener,noreferrer");}
      else window.open(`https://wa.me/?text=${encodeURIComponent(textLines)}`,"_blank","noopener,noreferrer");
      setCustomerName("");setCustomerPhone("");setNote("");setQuantities({});await qc.invalidateQueries({queryKey:["mini-shop"]});setTab("history");
    }catch(err){toast.error(err instanceof Error?err.message:"Could not issue receipt.");}
    finally{setBusy(false);}
  }
  function productLink(p:Product){return `${window.location.origin}/?product=${encodeURIComponent(p.id)}`;}
  async function shareProduct(p:Product){const url=productLink(p);try{await navigator.clipboard.writeText(url);toast.success("Product link copied. Share it anywhere!");}catch{window.prompt("Copy your product link:",url);}}
  function shareCatalog(){
    if(!store){toast.error("Set up your shop first.");return;}
    const text=[`🛍️ ${store.store_name}`,store.tagline,...products.filter(p=>p.is_available).map(p=>`${p.title} — ${money(p.price_kobo)}`),store.pickup_delivery_note,store.whatsapp_phone? `Order: ${store.whatsapp_phone}`:""].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank","noopener,noreferrer");
  }

  if(q.isLoading)return <div className="h-48 animate-pulse rounded-2xl bg-muted"/>;
  if(q.error)return <div className="rounded-2xl border p-4 text-sm text-destructive">Couldn't load Mini Shop. Refresh and try again.</div>;

  const tabs=[{id:"store" as const,label:"My Store",icon:Store},{id:"products" as const,label:"Products",icon:Package},{id:"receipt" as const,label:"Issue Receipt",icon:ReceiptText},{id:"history" as const,label:"Receipts",icon:CheckCircle2}];
  const filteredMarket=(marketQuery.data??[]).filter(p=>{const search=marketSearch.trim().toLowerCase();const seller=p.vendor_stores?.store_name??"";const matchSearch=!search||[p.title,p.description,p.category,seller,p.state].some(v=>(v??"").toLowerCase().includes(search));return matchSearch&&(!marketState||p.state===marketState)&&(!marketCategory||p.category===marketCategory);});
  if(section==="choose")return <div className="space-y-4 rounded-3xl bg-gradient-to-b from-orange-50 via-white to-amber-50 p-4 dark:from-orange-950/25 dark:via-background dark:to-amber-950/15"><div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white shadow-md"><h1 className="text-2xl font-bold">Mini Shop</h1><p className="mt-1 text-sm text-orange-50">Your storefront and a marketplace for discovering products.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><button onClick={()=>setSection("my-shop")} className="group rounded-2xl border border-orange-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-orange-900 dark:bg-card"><div className="flex items-center gap-3"><span className="grid size-14 place-items-center rounded-2xl bg-orange-500 text-white shadow"><Store className="size-7"/></span><div><h2 className="text-lg font-bold text-orange-800 dark:text-orange-300">My Shop</h2><p className="text-sm text-muted-foreground">Manage your store and products</p></div></div><p className="mt-4 text-sm">Set up your business profile, upload product photos, list products, and create customer receipts.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">Open My Shop →</span></button><button onClick={()=>setSection("market")} className="group rounded-2xl border border-emerald-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900 dark:bg-card"><div className="flex items-center gap-3"><span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow"><ShoppingBag className="size-7"/></span><div><h2 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">Market</h2><p className="text-sm text-muted-foreground">Discover products from sellers</p></div></div><p className="mt-4 text-sm">Explore products marketed by Smart Browsers vendors, search by product or seller, and filter by category or state.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">Explore Market →</span></button></div></div>;
  if(section==="market")return <div className="space-y-4 rounded-3xl bg-gradient-to-b from-emerald-50 via-white to-teal-50 p-3 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/15"><div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white shadow-md"><button onClick={()=>setSection("choose")} className="mb-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm"><ArrowLeft className="size-4"/> Mini Shop</button><h1 className="text-2xl font-extrabold">Smart Browsers Market</h1><p className="mt-1 text-sm text-emerald-50">Discover products from shops across Nigeria.</p></div><div className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm dark:border-emerald-900 dark:bg-card"><div className="relative"><Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"/><input value={marketSearch} onChange={e=>setMarketSearch(e.target.value)} placeholder="Search product, seller or business..." className="w-full rounded-xl border bg-background py-3 pl-10 pr-3"/></div><div className="grid grid-cols-2 gap-2"><select value={marketCategory} onChange={e=>setMarketCategory(e.target.value)} className="rounded-xl border bg-background p-3 text-sm"><option value="">All categories</option>{PRODUCT_CATEGORIES.map(cat=><option key={cat}>{cat}</option>)}</select><select value={marketState} onChange={e=>setMarketState(e.target.value)} className="rounded-xl border bg-background p-3 text-sm"><option value="">All states</option>{NIGERIAN_STATES.map(state=><option key={state}>{state}</option>)}</select></div><p className="text-xs text-muted-foreground">{filteredMarket.length} product{filteredMarket.length===1?"":"s"} found</p></div>{marketQuery.isLoading?<div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(n=><div key={n} className="h-56 animate-pulse rounded-2xl bg-muted"/> )}</div>:marketQuery.error?<div className="rounded-xl border p-4 text-sm text-destructive">Market could not load right now. Refresh and try again.</div>:filteredMarket.length===0?<div className="rounded-2xl border border-dashed p-8 text-center"><ShoppingBag className="mx-auto size-10 text-muted-foreground"/><h2 className="mt-2 font-semibold">No matching products yet</h2><p className="mt-1 text-sm text-muted-foreground">Try another search or filter.</p></div>:<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{filteredMarket.map(p=><button key={p.id} onClick={()=>setSelectedMarketProduct(p)} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white text-left shadow-sm transition hover:shadow-md dark:border-emerald-900 dark:bg-card"><div className="aspect-square bg-muted">{p.image_url?<img src={p.image_url} alt={p.title} className="size-full object-cover"/>:<div className="grid size-full place-items-center"><Package className="size-10 text-muted-foreground"/></div>}</div><div className="space-y-1 p-3"><p className="line-clamp-2 text-sm font-semibold">{p.title}</p><p className="font-bold text-emerald-700 dark:text-emerald-300">{money(p.price_kobo)}</p><p className="truncate text-xs text-muted-foreground">{p.vendor_stores?.store_name??"Seller"}</p><p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="size-3"/>{p.state||"State not specified"}</p></div></button>)}</div>}{selectedMarketProduct&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={()=>setSelectedMarketProduct(null)}><div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-3xl bg-background p-4 shadow-xl" onClick={e=>e.stopPropagation()}><button onClick={()=>setSelectedMarketProduct(null)} className="mb-3 rounded-full border px-3 py-1 text-sm">Close</button>{selectedMarketProduct.image_url&&<img src={selectedMarketProduct.image_url} alt={selectedMarketProduct.title} className="max-h-72 w-full rounded-2xl object-contain bg-muted"/>}<h2 className="mt-3 text-xl font-bold">{selectedMarketProduct.title}</h2><p className="mt-1 text-xl font-extrabold text-emerald-600">{money(selectedMarketProduct.price_kobo)}</p><p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><Tag className="size-4"/>{selectedMarketProduct.category}</p><p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4"/>{selectedMarketProduct.state}</p><p className="mt-3 whitespace-pre-wrap text-sm">{selectedMarketProduct.description||"No description provided."}</p><div className="mt-4 rounded-xl bg-muted p-3"><p className="font-semibold">{selectedMarketProduct.vendor_stores?.store_name}</p><p className="text-sm text-muted-foreground">{selectedMarketProduct.vendor_stores?.pickup_delivery_note}</p></div>{selectedMarketProduct.vendor_stores?.whatsapp_phone&&<a href={`https://wa.me/${selectedMarketProduct.vendor_stores.whatsapp_phone.replace(/\\D/g,"")}?text=${encodeURIComponent("Hi, I'm interested in "+selectedMarketProduct.title+" listed on Smart Browsers Market.")}`} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white"><MessageCircle className="size-5"/>Contact seller on WhatsApp</a>}</div></div>}</div>;
  if(section==="my-shop")return <div className="space-y-3"><button onClick={()=>setSection("choose")} className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm"><ArrowLeft className="size-4"/>Back to Mini Shop</button><div className="space-y-4 rounded-3xl bg-gradient-to-b from-orange-50 via-white to-amber-50 p-3 dark:from-orange-950/25 dark:via-background dark:to-amber-950/15">
    <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white shadow-md"><div className="flex items-center gap-2"><Store className="size-6"/><div><h1 className="text-xl font-bold">My Mini Shop</h1><p className="text-sm text-orange-50">Your business, beautifully presented.</p></div></div></div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm dark:border-orange-900 dark:bg-card"><p className="text-xs text-muted-foreground">Products</p><p className="mt-1 text-xl font-bold">{products.length}</p></div>
      <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm dark:border-orange-900 dark:bg-card"><p className="text-xs text-muted-foreground">Available</p><p className="mt-1 text-xl font-bold">{products.filter(p=>p.is_available).length}</p></div>
      <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm dark:border-orange-900 dark:bg-card"><p className="text-xs text-muted-foreground">Receipts issued</p><p className="mt-1 text-xl font-bold">{receipts.length}</p></div>
      <div className="rounded-2xl border border-orange-100 bg-white p-3 shadow-sm dark:border-orange-900 dark:bg-card"><p className="text-xs text-muted-foreground">Shop status</p><p className="mt-1 text-xl font-bold">{store?"Set up":"Not set"}</p></div>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium ${tab===t.id?"bg-orange-500 text-white border-orange-500 shadow-sm":"bg-white border-orange-100 hover:bg-orange-50 dark:bg-card dark:border-orange-900"}`}><t.icon className="size-4"/>{t.label}</button>)}
    </div>

    {tab==="store"&&<section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-orange-900 dark:bg-card sm:p-5">
      <h2 className="font-display text-lg font-semibold">Store setup</h2><p className="mt-1 text-sm text-muted-foreground">Give customers the information they need to order from you.</p>
      <form className="mt-4 space-y-3" onSubmit={submitStore}>
        <label className="block text-sm font-medium">Shop name<input required maxLength={80} value={storeForm.store_name} onChange={e=>setStoreForm(s=>({...s,store_name:e.target.value,slug:storeTouched?s.slug:slugify(e.target.value)}))} placeholder="e.g. Chibundu Gadgets" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
        <label className="block text-sm font-medium">Your shop link name<input required minLength={3} maxLength={40} value={storeForm.slug} onChange={e=>{setStoreTouched(true);setStoreForm(s=>({...s,slug:slugify(e.target.value)}));}} placeholder="chibundu-gadgets" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/><p className="mt-1 text-xs text-muted-foreground">This will become your shareable shop address when public storefronts launch.</p></label>
        <label className="block text-sm font-medium">Tagline<input maxLength={140} value={storeForm.tagline} onChange={e=>setStoreForm(s=>({...s,tagline:e.target.value}))} placeholder="Affordable gadgets, delivered around campus" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
        <label className="block text-sm font-medium">WhatsApp order number<input value={storeForm.whatsapp_phone} onChange={e=>setStoreForm(s=>({...s,whatsapp_phone:e.target.value}))} inputMode="tel" placeholder="08012345678" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
        <label className="block text-sm font-medium">Delivery or pickup details<textarea maxLength={500} rows={3} value={storeForm.pickup_delivery_note} onChange={e=>setStoreForm(s=>({...s,pickup_delivery_note:e.target.value}))} placeholder="Delivery areas, pickup point, opening hours..." className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
        <button disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy?<Loader2 className="mx-auto size-4 animate-spin"/>:"Save shop profile"}</button>
      </form>
      {store&&<button onClick={shareCatalog} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium"><Share2 className="size-4"/>Share catalogue on WhatsApp</button>}
    </section>}

    {tab==="products"&&<div className="space-y-4">
      <section className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm dark:border-orange-900 dark:bg-card sm:p-5"><h2 className="font-display text-lg font-semibold text-orange-800 dark:text-orange-300">{editing?"Edit product":"Add product"}</h2>
        {!store&&<p className="mt-2 rounded-xl bg-amber-500/10 p-3 text-sm">Create your store profile first to add products.</p>}
        <form onSubmit={submitProduct} className="mt-3 space-y-3">
          <label className="block text-sm font-medium">Product name<input required maxLength={120} value={productForm.title} onChange={e=>setProductForm(s=>({...s,title:e.target.value}))} placeholder="Product name" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
          <label className="block text-sm font-medium">Price (₦)<input required type="number" min="1" step="0.01" value={productForm.price} onChange={e=>setProductForm(s=>({...s,price:e.target.value}))} placeholder="2500" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
          <label className="block text-sm font-medium">Product category<select required value={productForm.category} onChange={e=>setProductForm(s=>({...s,category:e.target.value}))} className="mt-1 w-full rounded-xl border bg-background px-3 py-3">{PRODUCT_CATEGORIES.map(cat=><option key={cat} value={cat}>{cat}</option>)}</select></label>
          <label className="block text-sm font-medium">State you are marketing from<select required value={productForm.state} onChange={e=>setProductForm(s=>({...s,state:e.target.value}))} className="mt-1 w-full rounded-xl border bg-background px-3 py-3"><option value="">Choose your state</option>{NIGERIAN_STATES.map(state=><option key={state} value={state}>{state}</option>)}</select><p className="mt-1 text-xs text-muted-foreground">Customers in Market can filter products by state.</p></label>
          <label className="block text-sm font-medium">Description<textarea rows={2} maxLength={1000} value={productForm.description} onChange={e=>setProductForm(s=>({...s,description:e.target.value}))} className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
          <div className="space-y-2">
          <label className="block text-sm font-medium">Product photo <span className="text-orange-600">* Required</span></label>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-5 text-center dark:border-orange-800 dark:bg-orange-950/20">
            {imagePreview?<img src={imagePreview} alt="Product image preview" className="max-h-48 max-w-full rounded-xl object-contain"/>:<div className="grid size-14 place-items-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-900/40"><Plus className="size-7"/></div>}
            <span className="font-semibold text-orange-800 dark:text-orange-300">{imagePreview?"Change product image":"Tap to upload product image"}</span>
            <span className="text-xs text-muted-foreground">JPG, PNG, WEBP · max 5 MB</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>5*1024*1024){toast.error("Image must be 5 MB or smaller.");e.currentTarget.value="";return;}if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast.error("Upload JPG, PNG, or WEBP.");e.currentTarget.value="";return;}setProductImage(file);setImagePreview(URL.createObjectURL(file));setProductForm(s=>({...s,image_url:""}));}}/>
          </label>
          {imagePreview&&<button type="button" onClick={()=>{setProductImage(null);setImagePreview("");setProductForm(s=>({...s,image_url:""}));}} className="text-sm text-destructive underline">Remove image</button>}
        </div>
          <label className="block text-sm font-medium">Stock quantity (leave blank if you don't track stock)<input type="number" min="0" value={productForm.stock} onChange={e=>setProductForm(s=>({...s,stock:e.target.value}))} className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.is_available} onChange={e=>setProductForm(s=>({...s,is_available:e.target.checked}))}/>Available for sale</label>
          <div className="flex gap-2"><button disabled={busy||!store} className="flex-1 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{editing?"Update product":"Add product"}</button>{editing&&<button type="button" onClick={()=>startProduct()} className="rounded-xl border px-4 py-3">Cancel</button>}</div>
        </form>
      </section>
      <section className="space-y-2"><h2 className="font-semibold text-orange-800 dark:text-orange-300">Your products ({products.length})</h2>
        {products.length===0?<p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Your product catalogue is empty.</p>:products.map(p=><div key={p.id} className="flex items-center gap-3 rounded-xl border border-orange-100 bg-white p-3 shadow-sm dark:border-orange-900 dark:bg-card"><img src={p.image_url||""} alt={p.title} className="size-16 rounded-xl bg-orange-50 object-cover"/><div className="min-w-0 flex-1"><p className="truncate font-medium">{p.title}</p><p className="text-sm text-muted-foreground">{p.category} · {p.state} · {money(p.price_kobo)} · {p.is_available?"Available":"Sold out"}{p.stock_quantity!==null? ` · ${p.stock_quantity} left`:""}</p><div className="mt-2 flex flex-wrap items-center gap-2"><button type="button" onClick={()=>shareProduct(p)} className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300"><Copy className="size-3.5"/>Copy product link</button><a href={productLink(p)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs"><ExternalLink className="size-3.5"/>Preview</a></div></div><button onClick={()=>startProduct(p)} aria-label="Edit product" className="rounded-lg border p-2"><Pencil className="size-4"/></button><button onClick={()=>deleteProduct(p)} aria-label="Delete product" className="rounded-lg border p-2 text-destructive"><Trash2 className="size-4"/></button></div>)}
      </section>
    </div>}

    {tab==="receipt"&&<section className="rounded-2xl border bg-card p-4 sm:p-5"><h2 className="font-display text-lg font-semibold">Issue a receipt</h2><p className="mt-1 text-sm text-muted-foreground">Select products from your saved catalogue. Prices and totals are calculated securely.</p>
      {products.length===0?<p className="mt-4 rounded-xl bg-muted p-3 text-sm">Add products to your shop first.</p>:<form onSubmit={makeReceipt} className="mt-4 space-y-4">\n      <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-3 dark:border-orange-900 dark:bg-orange-950/10">
        <div className="mb-2 flex items-center justify-between gap-2"><div><h3 className="font-semibold">Live receipt preview</h3><p className="text-xs text-muted-foreground">This paper updates as you fill in the form.</p></div><ReceiptText className="size-5 text-orange-600"/></div>
        <div id="mini-shop-receipt-preview" className="relative mx-auto w-full max-w-[420px] overflow-hidden border border-stone-200 bg-white p-5 text-stone-900 shadow-lg" style={{fontFamily:"Arial, sans-serif"}}>
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.065]" aria-hidden="true"><div className="absolute -left-8 -top-2 flex h-full w-[140%] rotate-[-32deg] flex-col justify-around text-center text-2xl font-black tracking-widest text-stone-800">{Array.from({length:8},(_,i)=><div key={i} className="whitespace-nowrap">SMART BROWSERS • {store?.store_name||"YOUR BUSINESS"} • SMART BROWSERS • {store?.store_name||"YOUR BUSINESS"}</div>)}</div></div>
          <div className="relative">
            <div className="text-center"><div className="text-xs font-black tracking-[0.2em] text-emerald-700">SMART BROWSERS</div><h2 className="mt-1 text-xl font-extrabold">{store?.store_name||"Your Business Name"}</h2>{store?.tagline&&<p className="text-xs text-stone-500">{store.tagline}</p>}<p className="mt-2 text-xs font-bold tracking-[0.18em]">SALES RECEIPT</p></div>
            <div className="my-3 border-y border-dashed border-stone-300 py-2 text-xs"><div className="flex justify-between"><span>Receipt No.</span><span>Generated after issuing</span></div><div className="mt-1 flex justify-between"><span>Date</span><span>{new Date().toLocaleString("en-NG")}</span></div><div className="mt-1"><span>Customer: </span><span className="font-semibold">{customerName||"Customer name"}</span></div>{customerPhone&&<div className="mt-1">Phone: {customerPhone}</div>}</div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-stone-300 pb-1 text-[10px] font-bold uppercase"><span>Item</span><span>Qty</span><span>Amount</span></div>
            <div className="min-h-12 py-2 text-xs">{chosen.length?chosen.map(p=><div key={p.id} className="grid grid-cols-[1fr_auto_auto] gap-2 py-1"><span className="break-words">{p.title}<small className="block text-stone-500">{money(p.price_kobo)} each</small></span><span>{quantities[p.id]}</span><span className="text-right font-semibold">{money(p.price_kobo*(quantities[p.id]??0))}</span></div>):<p className="py-3 text-center text-stone-400">Selected products will appear here</p>}</div>
            <div className="border-t border-dashed border-stone-300 pt-2"><div className="flex justify-between text-xs"><span>Subtotal</span><span>{money(total)}</span></div><div className="mt-1 flex justify-between text-base font-extrabold"><span>TOTAL</span><span>{money(total)}</span></div></div>
            <div className="mt-3 flex items-center justify-between gap-2"><div className="rounded border border-stone-200 px-2 py-1 text-[10px]">{paymentStatus==="paid"?"PAYMENT: PAID":"PAYMENT: UNPAID"}</div><div className="flex size-20 rotate-[-12deg] items-center justify-center rounded-full border-[3px] border-orange-700 text-center text-[9px] font-black uppercase leading-tight text-orange-700"><div className="px-1">{store?.store_name||"BUSINESS NAME"}<br/>SELLER CONFIRMATION<br/>{paymentStatus==="paid"?"PAID":"UNPAID"}<br/>• SBR •</div></div></div>
            {note&&<div className="mt-2 border-t border-stone-200 pt-2 text-xs"><strong>Note:</strong> {note}</div>}
            <p className="mt-3 text-center text-xs text-stone-500">Thank you for your patronage!</p><p className="mt-1 text-center text-[9px] text-stone-400">Powered by Smart Browsers</p>
          </div>
        </div>
      </div>

        <div className="space-y-2">{products.map(p=><div key={p.id} className="flex items-center gap-3 rounded-xl border p-3"><div className="min-w-0 flex-1"><p className="font-medium">{p.title}</p><p className="text-sm text-muted-foreground">{money(p.price_kobo)} each</p></div><input aria-label={`Quantity of ${p.title}`} type="number" min="0" max="1000" value={quantities[p.id]??0} onChange={e=>setQuantities(q=>({...q,[p.id]:Math.max(0,Number(e.target.value)||0)}))} className="w-20 rounded-lg border bg-background p-2 text-center"/></div>)}</div>
        <div className="rounded-xl bg-muted/60 p-4"><div className="flex justify-between text-sm"><span>Items selected</span><span>{chosen.length}</span></div><div className="mt-2 flex justify-between text-lg font-bold"><span>Total</span><span>{money(total)}</span></div></div>
        <label className="block text-sm font-medium">Customer name (optional)<input value={customerName} onChange={e=>setCustomerName(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
        <label className="block text-sm font-medium">Customer WhatsApp/phone (optional)<input value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} inputMode="tel" placeholder="Include country code if convenient" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
        <label className="block text-sm font-medium">Payment status<select value={paymentStatus} onChange={e=>setPaymentStatus(e.target.value as "paid"|"unpaid")} className="mt-1 w-full rounded-xl border bg-background px-3 py-3"><option value="paid">Paid — confirmed by me, the seller</option><option value="unpaid">Unpaid</option></select></label>
        <label className="block text-sm font-medium">Note (optional)<textarea maxLength={300} rows={2} value={note} onChange={e=>setNote(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label>
        {paymentStatus==="paid"&&<p className="rounded-lg bg-amber-500/10 p-3 text-xs">The receipt will say payment was confirmed by the seller. Smart Browsers does not independently verify this payment.</p>}
        <button type="button" disabled={total<=0} onClick={printLiveReceipt} className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3 font-semibold text-orange-800 disabled:opacity-50"><ReceiptText className="size-4"/>Print / Save paper receipt as PDF</button><button disabled={busy||total<=0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy?<Loader2 className="size-4 animate-spin"/>:"Save receipt & send via WhatsApp"}</button>
      </form>}
    </section>}

    {tab==="history"&&<section className="space-y-3"><h2 className="font-display text-lg font-semibold">Receipt history</h2>{receipts.length===0?<p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">You haven't issued any receipts yet.</p>:receipts.map(r=><div key={r.id} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{r.receipt_number}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-NG")}{r.customer_name?` · ${r.customer_name}`:""}</p></div><span className={`rounded-full px-2 py-1 text-xs font-semibold ${r.payment_status==="paid"?"bg-emerald-500/10 text-emerald-700":"bg-amber-500/10 text-amber-700"}`}>{r.payment_status==="paid"?"PAID":"UNPAID"}</span></div><div className="mt-2 space-y-1 text-sm">{r.items.map((it:any,i:number)=><p key={i}>{it.quantity} × {it.title} — {money(it.line_total_kobo)}</p>)}</div><p className="mt-3 border-t pt-2 text-right font-bold">Total: {money(r.subtotal_kobo)}</p><button onClick={()=>{const lines=[`🧾 ${store?.store_name??"Receipt"}`,`Receipt: ${r.receipt_number}`,...r.items.map((it:any)=>`${it.quantity} × ${it.title} — ${money(it.line_total_kobo)}`),`TOTAL: ${money(r.subtotal_kobo)}`,`Payment: ${r.payment_status==="paid"?"PAID (confirmed by seller)":"UNPAID"}`].join("\n");window.open(`https://wa.me/${r.customer_phone.replace(/\D/g,"")}?text=${encodeURIComponent(lines)}`,"_blank","noopener,noreferrer");}} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm"><Share2 className="size-4"/>Send again on WhatsApp</button></div>)}</section>}
  </div></div>;
}
