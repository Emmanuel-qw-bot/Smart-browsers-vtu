import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Flame, ArrowRight, Store, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FeaturedDeal={id:string;title:string;description:string;category:string;state:string;price_kobo:number;image_url:string|null;featured_label:string;store_name:string;store_slug:string};
const money=(k:number)=>"₦"+(k/100).toLocaleString("en-NG",{maximumFractionDigits:2});

export function FeaturedMarketDeals(){
  const q=useQuery({queryKey:["featured-market-deals"],queryFn:async()=>{
    const {data,error}=await supabase.rpc("get_featured_market_deals");
    if(error)throw error;
    return (data??[]) as unknown as FeaturedDeal[];
  },staleTime:5*60*1000});
  const deals=q.data??[];
  if(q.isLoading||q.isError||deals.length===0)return null;
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <div><div className="flex items-center gap-2"><Flame className="size-5 text-orange-500"/><h2 className="font-display text-lg font-semibold">Featured Deals</h2></div><p className="text-xs text-muted-foreground">Discover products promoted by sellers on Smart Browsers</p></div>
      <Link to="/app/$section" params={{section:"mini-shop"}} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">Market <ArrowRight className="size-3.5"/></Link>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
      {deals.map(d=><a key={d.id} href={"/?product="+encodeURIComponent(d.id)} className="group relative min-w-[245px] max-w-[290px] flex-1 snap-start overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-card to-amber-50 shadow-soft transition hover:-translate-y-0.5 dark:border-orange-900 dark:from-orange-950/30 dark:to-amber-950/20">
        <div className="relative aspect-[5/3] overflow-hidden bg-muted">
          {d.image_url?<img src={d.image_url} alt={d.title} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105"/>:<div className="grid h-full place-items-center"><Tag className="size-10 text-muted-foreground"/></div>}
          <span className="absolute left-2 top-2 rounded-full bg-orange-600 px-2.5 py-1 text-[10px] font-bold text-white shadow">{d.featured_label||"Featured Deal"}</span>
        </div>
        <div className="space-y-1.5 p-3">
          <p className="line-clamp-1 text-sm font-bold">{d.title}</p>
          <p className="text-lg font-black text-orange-700 dark:text-orange-300">{money(d.price_kobo)}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Store className="size-3.5 shrink-0"/>{d.store_name}</p>
          <p className="line-clamp-1 text-[10px] text-muted-foreground">{d.category} · {d.state}</p>
          <span className="inline-flex w-full items-center justify-center gap-1 rounded-xl bg-orange-600 px-3 py-2 text-xs font-semibold text-white">View Deal <ArrowRight className="size-3.5"/></span>
        </div>
      </a>)}
    </div>
  </section>;
}
