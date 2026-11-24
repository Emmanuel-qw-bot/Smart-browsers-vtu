import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Wifi, Zap, ArrowLeft, Share2, ShoppingBag, MapPin, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { Footer } from "@/components/shared/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Browsers — Data, Airtime & More | SBR 2026" },
      { name: "description", content: "Buy data and airtime, convert airtime to cash and earn rewards with Smart Browsers." },
      { property: "og:title", content: "Smart Browsers — SBR 2026" },
      { property: "og:description", content: "Create an account and get ₦100 free. Data, airtime and rewards in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const [splash, setSplash] = useState(true);
  const [publicProductId, setPublicProductId] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("product");
    if (id) {
      setPublicProductId(id);
      setSplash(false);
    }
  }, []);
  useEffect(() => {
    if(publicProductId)return;
    const t = setTimeout(() => setSplash(false), 3600);
    return () => clearTimeout(t);
  }, []);

  if(publicProductId)return <PublicProductPage productId={publicProductId}/>;

  if (splash) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-brand px-6 text-primary-foreground" onClick={() => setSplash(false)}>
        <div className="w-full max-w-md text-center">
          <Logo animated />
          <p className="mt-2 text-sm font-bold tracking-[0.5em] animate-rise" style={{ animationDelay: "2.2s" }}>SBR 2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-brand font-sans text-primary-foreground">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary-glow/40 blur-3xl" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-14">
        <div className="animate-rise">
          <Logo className="max-w-[260px]" />
          <p className="text-xs font-bold tracking-[0.5em] opacity-80">SBR 2026</p>
        </div>

        <div className="mt-auto space-y-6">
          <div className="rounded-3xl bg-card p-6 text-card-foreground shadow-soft animate-rise" style={{ animationDelay: ".15s" }}>
            <span className="inline-block rounded-full bg-gold px-3 py-1 text-[11px] font-bold tracking-wider text-charcoal">WELCOME OFFER</span>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight">
              CREATE AN ACCOUNT AND GET <span className="text-primary">₦100 FREE!</span>
            </h1>
            <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-muted-foreground">
              <li className="rounded-xl bg-muted p-3"><Wifi className="mx-auto mb-1 size-5 text-primary" />Cheap data</li>
              <li className="rounded-xl bg-muted p-3"><Zap className="mx-auto mb-1 size-5 text-primary" />Fast top-ups</li>
              <li className="rounded-xl bg-muted p-3"><ShieldCheck className="mx-auto mb-1 size-5 text-primary" />Secure</li>
            </ul>
          </div>
          <div className="grid gap-3 animate-rise" style={{ animationDelay: ".3s" }}>
            <Link to="/signup" className="rounded-2xl bg-card py-4 text-center font-semibold text-primary-deep shadow-soft transition active:scale-[.98]">Create Account</Link>
            <Link to="/login" className="rounded-2xl border border-primary-foreground/60 py-4 text-center font-semibold transition hover:bg-primary-foreground/10 active:scale-[.98]">Login</Link>
          </div>
          <p className="text-center text-[11px] opacity-70">Bonus terms will be confirmed when wallets go live.</p>
          <Footer className="pb-0 text-primary-foreground/80" />
        </div>
      </div>
    </div>
  );
}

type PublicProductData={product:{id:string;title:string;description:string;category:string;price_kobo:number;image_url:string|null;is_available:boolean;state:string;stock_quantity:number|null};store:{store_name:string;slug:string;tagline:string;whatsapp_phone:string;pickup_delivery_note:string}};
function PublicProductPage({productId}:{productId:string}){
 const [data,setData]=useState<PublicProductData|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 const [orderOpen,setOrderOpen]=useState(false);
 const [orderForm,setOrderForm]=useState({name:"",phone:"",location:"",quantity:1,note:""});
 const [orderBusy,setOrderBusy]=useState(false);
 const [orderSuccess,setOrderSuccess]=useState<{number:string,total:number}|null>(null);
 useEffect(()=>{let active=true;supabase.rpc("get_vendor_product",{_product_id:productId}).then(({data,error})=>{if(!active)return;if(error||!data){setError("This product is unavailable or the link may be incorrect.");setLoading(false);return;}setData(data as unknown as PublicProductData);setLoading(false);});return()=>{active=false};},[productId]);
 const money=(k:number)=>"₦"+(k/100).toLocaleString("en-NG",{maximumFractionDigits:2});
 if(loading)return <main className="min-h-screen bg-background p-6 grid place-items-center"><Loader2 className="size-8 animate-spin text-primary"/></main>;
 if(error||!data)return <main className="min-h-screen bg-background p-6 grid place-items-center"><div className="max-w-sm text-center rounded-2xl border p-6"><h1 className="text-xl font-bold">Product not found</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><a href="/" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-primary-foreground">Visit Smart Browsers</a></div></main>;
 const {product,store}=data;const phone=store.whatsapp_phone.replace(/\D/g,"");const orderText=`Hello ${store.store_name}, I'm interested in ordering ${product.title} (${money(product.price_kobo)}). Is it available?`;
 return <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/20"><div className="mx-auto max-w-lg p-4 pb-10"><a href="/" className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm"><ArrowLeft className="size-4"/>Smart Browsers</a><article className="mt-4 overflow-hidden rounded-3xl border bg-card shadow-xl"><div className="aspect-square bg-muted">{product.image_url?<img src={product.image_url} alt={product.title} className="h-full w-full object-contain"/>:<div className="grid h-full place-items-center"><ShoppingBag className="size-16 text-muted-foreground"/></div>}</div><div className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{product.category} · {product.state}</p><h1 className="mt-2 text-2xl font-bold">{product.title}</h1><p className="mt-2 text-3xl font-black text-primary">{money(product.price_kobo)}</p>{product.description&&<p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{product.description}</p>}<div className="mt-4 rounded-2xl bg-muted/60 p-3"><p className="font-semibold">{store.store_name}</p>{store.tagline&&<p className="text-sm text-muted-foreground">{store.tagline}</p>}<p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0"/>{store.pickup_delivery_note||`Seller marketing from ${product.state}`}</p></div><p className={`mt-3 text-sm font-semibold ${product.is_available?"text-emerald-700":"text-destructive"}`}>{product.is_available?"Available":"Sold out"}{product.stock_quantity!==null? ` · ${product.stock_quantity} in stock`:""}</p><div className="mt-4 grid gap-2"><button disabled={!product.is_available} onClick={()=>{setOrderSuccess(null);setOrderOpen(true)}} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50"><ShoppingBag className="size-5"/>{product.is_available?"Order This Product":"Sold Out"}</button><a href={phone?`https://wa.me/${phone}?text=${encodeURIComponent(orderText)}`:`https://wa.me/?text=${encodeURIComponent(orderText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium"><MessageCircle className="size-5"/>Chat with Seller</a><button onClick={()=>{navigator.share?.({title:product.title,text:`${product.title} — ${money(product.price_kobo)} at ${store.store_name}`,url:window.location.href})}} className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium"><Share2 className="size-4"/>Share product</button></div></div></article>{orderOpen&&<div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center"><div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-3xl bg-background p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Place your order</h2><p className="text-sm text-muted-foreground">{product.title} · {money(product.price_kobo)}</p></div><button onClick={()=>setOrderOpen(false)} className="rounded-lg border px-3 py-1.5 text-sm">Close</button></div>{orderSuccess?<div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/30"><p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Order received!</p><p className="mt-2 font-semibold">Order #{orderSuccess.number}</p><p className="mt-2 text-sm">Total: {money(orderSuccess.total)}</p><p className="mt-2 text-sm">The seller will contact you to confirm the order and payment/delivery details.</p>{phone&&<a className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${phone}?text=${encodeURIComponent(`Hello ${store.store_name}, I placed order ${orderSuccess.number} for ${product.title}. Please confirm.`)}`}><MessageCircle className="size-4"/>Message seller on WhatsApp</a>}<button onClick={()=>setOrderOpen(false)} className="mt-3 w-full rounded-xl border px-4 py-3">Done</button></div>:<form className="mt-4 space-y-3" onSubmit={async e=>{e.preventDefault();setOrderBusy(true);try{const {data:result,error:rpcError}=await supabase.rpc("create_vendor_order" as any,{_product_id:product.id,_buyer_name:orderForm.name,_buyer_phone:orderForm.phone,_delivery_location:orderForm.location,_quantity:orderForm.quantity,_buyer_note:orderForm.note});if(rpcError)throw rpcError;const resultObj=result as any;setOrderSuccess({number:resultObj.order_number,total:resultObj.total_kobo});}catch(err:any){alert(err?.message||"Order could not be submitted. Please try again.");}finally{setOrderBusy(false);}}}><label className="block text-sm font-medium">Full name<input required minLength={2} maxLength={100} value={orderForm.name} onChange={e=>setOrderForm(v=>({...v,name:e.target.value}))} className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label><label className="block text-sm font-medium">Phone number<input required minLength={7} maxLength={30} inputMode="tel" value={orderForm.phone} onChange={e=>setOrderForm(v=>({...v,phone:e.target.value}))} placeholder="080..." className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label><label className="block text-sm font-medium">Delivery / pickup location<input required minLength={2} maxLength={300} value={orderForm.location} onChange={e=>setOrderForm(v=>({...v,location:e.target.value}))} placeholder="Area, address, campus or pickup point" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label><label className="block text-sm font-medium">Quantity<input required type="number" min={1} max={99} value={orderForm.quantity} onChange={e=>setOrderForm(v=>({...v,quantity:Math.max(1,Math.min(99,Number(e.target.value)||1))}))} className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label><label className="block text-sm font-medium">Note (optional)<textarea maxLength={500} rows={2} value={orderForm.note} onChange={e=>setOrderForm(v=>({...v,note:e.target.value}))} placeholder="Colour, size or extra information" className="mt-1 w-full rounded-xl border bg-background px-3 py-3"/></label><div className="rounded-xl bg-muted p-3 text-sm"><div className="flex justify-between"><span>Price × quantity</span><strong>{money(product.price_kobo*orderForm.quantity)}</strong></div><p className="mt-1 text-xs text-muted-foreground">This is an order request, not a payment. The seller will confirm availability and payment.</p></div><button disabled={orderBusy} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{orderBusy?"Submitting...":"Confirm Order"}</button></form>}</div></div>}<p className="mt-4 text-center text-xs text-muted-foreground">Powered by Smart Browsers · Shop confidently, buy directly from the seller.</p></div></main>;
}
