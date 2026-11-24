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
 useEffect(()=>{let active=true;supabase.rpc("get_vendor_product",{_product_id:productId}).then(({data,error})=>{if(!active)return;if(error||!data){setError("This product is unavailable or the link may be incorrect.");setLoading(false);return;}setData(data as unknown as PublicProductData);setLoading(false);});return()=>{active=false};},[productId]);
 const money=(k:number)=>"₦"+(k/100).toLocaleString("en-NG",{maximumFractionDigits:2});
 if(loading)return <main className="min-h-screen bg-background p-6 grid place-items-center"><Loader2 className="size-8 animate-spin text-primary"/></main>;
 if(error||!data)return <main className="min-h-screen bg-background p-6 grid place-items-center"><div className="max-w-sm text-center rounded-2xl border p-6"><h1 className="text-xl font-bold">Product not found</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p><a href="/" className="mt-4 inline-flex rounded-xl bg-primary px-4 py-2 text-primary-foreground">Visit Smart Browsers</a></div></main>;
 const {product,store}=data;const phone=store.whatsapp_phone.replace(/\D/g,"");const orderText=`Hello ${store.store_name}, I'm interested in ordering ${product.title} (${money(product.price_kobo)}). Is it available?`;
 return <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/20"><div className="mx-auto max-w-lg p-4 pb-10"><a href="/" className="inline-flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm"><ArrowLeft className="size-4"/>Smart Browsers</a><article className="mt-4 overflow-hidden rounded-3xl border bg-card shadow-xl"><div className="aspect-square bg-muted">{product.image_url?<img src={product.image_url} alt={product.title} className="h-full w-full object-contain"/>:<div className="grid h-full place-items-center"><ShoppingBag className="size-16 text-muted-foreground"/></div>}</div><div className="p-5"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{product.category} · {product.state}</p><h1 className="mt-2 text-2xl font-bold">{product.title}</h1><p className="mt-2 text-3xl font-black text-primary">{money(product.price_kobo)}</p>{product.description&&<p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{product.description}</p>}<div className="mt-4 rounded-2xl bg-muted/60 p-3"><p className="font-semibold">{store.store_name}</p>{store.tagline&&<p className="text-sm text-muted-foreground">{store.tagline}</p>}<p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0"/>{store.pickup_delivery_note||`Seller marketing from ${product.state}`}</p></div><p className={`mt-3 text-sm font-semibold ${product.is_available?"text-emerald-700":"text-destructive"}`}>{product.is_available?"Available":"Sold out"}{product.stock_quantity!==null? ` · ${product.stock_quantity} in stock`:""}</p><div className="mt-4 grid gap-2"><a href={phone?`https://wa.me/${phone}?text=${encodeURIComponent(orderText)}`:`https://wa.me/?text=${encodeURIComponent(orderText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white"><MessageCircle className="size-5"/>Order / Contact Seller on WhatsApp</a><button onClick={()=>{navigator.share?.({title:product.title,text:`${product.title} — ${money(product.price_kobo)} at ${store.store_name}`,url:window.location.href})}} className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium"><Share2 className="size-4"/>Share product</button></div></div></article><p className="mt-4 text-center text-xs text-muted-foreground">Powered by Smart Browsers · Shop confidently, buy directly from the seller.</p></div></main>;
}
