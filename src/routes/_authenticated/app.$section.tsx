import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { customerNav, findNav } from "@/config/navigation";
import { PageScaffold } from "@/components/shared/PageScaffold";
import { AccountPanel } from "@/components/customer/AccountPanel";
import { BalanceCard, TransactionList, WalletPanel } from "@/components/customer/WalletPanel";
import { CustomerProducts } from "@/components/customer/CustomerProducts";
import { CustomerDataPlans } from "@/components/customer/CustomerDataPlans";
import { CustomerSupport, customerSupportQuery } from "@/components/customer/CustomerSupport";
import { CustomerWeekendRush, customerWeekendRushQuery } from "@/components/customer/CustomerWeekendRush";
import { customerAnnouncementsQuery } from "@/components/customer/CustomerAnnouncements";
import { CustomerAnnouncementPopup } from "@/components/customer/CustomerAnnouncementPopup";
import { CustomerBadges } from "@/components/customer/CustomerBadges";
import { DashboardWelcome } from "@/components/customer/DashboardWelcome";
import { CustomerAirtimeCash } from "@/components/customer/CustomerAirtimeCash";
import { CustomerReferrals } from "@/components/customer/CustomerReferrals";
import { CustomerSquadRecharge } from "@/components/customer/CustomerSquadRecharge";
import { CustomerMiniShop } from "@/components/customer/CustomerMiniShop";
import { FeaturedMarketDeals } from "@/components/customer/FeaturedMarketDeals";\nimport { VendorSubscriptions } from "@/components/customer/VendorSubscriptions";

export const Route = createFileRoute("/_authenticated/app/$section")({
  loader: async ({ params, context }) => {
    const item = findNav(customerNav, params.section);
    if (!item) throw notFound();
    if (item.slug === "support") await context.queryClient.ensureQueryData(customerSupportQuery);
    if (item.slug === "weekend-rush") await context.queryClient.ensureQueryData(customerWeekendRushQuery);
    if (item.slug === "dashboard") await context.queryClient.ensureQueryData(customerAnnouncementsQuery);
    return { slug: item.slug };
  },
  head: ({ loaderData }) => {
    const item = loaderData ? findNav(customerNav, loaderData.slug) : undefined;
    const title = `${item?.label ?? "Account"} — Smart Browsers`;
    return {
      meta: [
        { title },
        { name: "description", content: item?.description ?? "Smart Browsers account" },
        { property: "og:title", content: title },
        { property: "og:description", content: item?.description ?? "Smart Browsers account" },
      ],
    };
  },
  component: SectionPage,
});

function SectionPage() {
  const { slug } = Route.useLoaderData();
  const queryClient=useQueryClient();
  const notificationsQuery=useQuery({queryKey:["user-notifications"],queryFn:async()=>{const {data,error}=await supabase.from("user_notifications" as any).select("id,notification_type,title,message,created_at,read_at,action_path").order("created_at",{ascending:false}).limit(30);if(error)throw error;return (data??[]) as {id:string;notification_type:string;title:string;message:string;created_at:string;read_at:string|null;action_path:string|null}[];},refetchInterval:30000});
  const notifications=notificationsQuery.data??[];
  const unread=notifications.filter(n=>!n.read_at);
  const badgeTypes:Record<string,string[]>={wallet:["wallet_credit"],rewards:["reward_ready"],"weekend-rush":["weekend_rush"],"mini-shop":["mini_shop_order"]};
  async function clearBadge(slug:string){if(slug==="mini-shop")return;const types=badgeTypes[slug];if(!types)return;await supabase.from("user_notifications" as any).update({read_at:new Date().toISOString()}).is("read_at",null).in("notification_type",types);await queryClient.invalidateQueries({queryKey:["user-notifications"]});}
  useEffect(()=>{const types:Record<string,string[]>={wallet:["wallet_credit"],rewards:["reward_ready"],"weekend-rush":["weekend_rush"]};const selected=types[slug];if(!selected)return;supabase.from("user_notifications" as any).update({read_at:new Date().toISOString()}).is("read_at",null).in("notification_type",selected).then(()=>queryClient.invalidateQueries({queryKey:["user-notifications"]}));},[slug,queryClient]);

  const item = findNav(customerNav, slug)!;
  if (slug === "account") {
      return <PageScaffold item={item} live><AccountPanel /></PageScaffold>;
      }

      if (slug === "wallet") {
        return <PageScaffold item={item} live><WalletPanel /></PageScaffold>;
        }

        if (slug === "referrals") return <PageScaffold item={item} live><CustomerReferrals /></PageScaffold>;

      if (slug === "rewards") {
        return <PageScaffold item={item} live><CustomerBadges /></PageScaffold>;
      }

      if (slug === "transactions") {
          return <PageScaffold item={item} live><TransactionList limit={200} /></PageScaffold>;
          }

          if (slug === "weekend-rush") {
    return <PageScaffold item={item} live><CustomerWeekendRush /></PageScaffold>;
  }

          if (slug === "support") {
    return <PageScaffold item={item} live><CustomerSupport /></PageScaffold>;
  }

  if (slug === "squad-recharge") return <PageScaffold item={item} live><CustomerSquadRecharge /></PageScaffold>;

  if (slug === "mini-shop") return <PageScaffold item={item} live><CustomerMiniShop /></PageScaffold>;\n  if (slug === "subscriptions") return <PageScaffold item={item} live><VendorSubscriptions /></PageScaffold>;

  if (slug === "buy-data") {
    return (
      <PageScaffold item={item} live>
        <CustomerDataPlans />
      </PageScaffold>
    );
  }

  if (slug === "airtime-to-cash") return <PageScaffold item={item} live><CustomerAirtimeCash /></PageScaffold>;

  if (slug === "buy-airtime") {
                              return (
                                  <PageScaffold item={item} live>
                                        <CustomerProducts service="airtime" />
                                            </PageScaffold>
                                              );
                                              }

                                              if (slug !== "dashboard") {
                                                return <PageScaffold item={item} />;
                                              }
  const quick = customerNav.filter((n) => ["buy-data", "squad-recharge", "buy-airtime", "airtime-to-cash", "wallet", "rewards", "referrals", "weekend-rush", "support", "mini-shop"].includes(n.slug));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 animate-rise">
      <DashboardWelcome />
      <BalanceCard />
      
      <FeaturedMarketDeals />
      <CustomerAnnouncementPopup />
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {quick.map((q) => {
          const styles: Record<string, { tile: string; icon: string }> = {
            wallet: { tile: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900", icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
            "buy-data": { tile: "bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900", icon: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300" },
            "buy-airtime": { tile: "bg-violet-50 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900", icon: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
            "airtime-to-cash": { tile: "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900", icon: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
            rewards: { tile: "bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900", icon: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
            referrals: { tile: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900", icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
            "weekend-rush": { tile: "bg-yellow-50 dark:bg-yellow-950/40 border-yellow-100 dark:border-yellow-900", icon: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
            support: { tile: "bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900", icon: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300" },
            "squad-recharge": { tile: "bg-fuchsia-50 dark:bg-fuchsia-950/40 border-fuchsia-100 dark:border-fuchsia-900", icon: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300" },
            "mini-shop": { tile: "bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900 ring-1 ring-orange-100 dark:ring-orange-900/60", icon: "bg-orange-500 text-white shadow-sm" },
          };
          const style = styles[q.slug] ?? { tile: "bg-card border-border", icon: "bg-secondary text-secondary-foreground" };
          return (
            <Link key={q.slug} to="/app/$section" params={{ section: q.slug }} onClick={()=>{void clearBadge(q.slug)}} className={"relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-[11px] font-medium shadow-soft transition active:scale-95 " + style.tile}>
              <span className={"grid size-10 place-items-center rounded-xl " + style.icon}><q.icon className="size-5" /></span>
              {q.label}
              {badgeTypes[q.slug]&&unread.filter(n=>badgeTypes[q.slug].includes(n.notification_type)).length>0&&<span className="absolute right-1 top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white shadow">{unread.filter(n=>badgeTypes[q.slug].includes(n.notification_type)).length>99?"99+":unread.filter(n=>badgeTypes[q.slug].includes(n.notification_type)).length}</span>}
            </Link>
          );
        })}
      </div>
      {notifications.length>0&&<section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Notifications</h2><span className="text-xs text-muted-foreground">{unread.length} unread</span></div><div className="space-y-2">{notifications.slice(0,6).map(n=><article key={n.id} className={"rounded-xl border p-3 "+(!n.read_at?"border-primary/30 bg-primary/5":"bg-card")}><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{n.title}</p><p className="mt-1 text-xs text-muted-foreground">{n.message}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("en-NG")}</p></div>{!n.read_at&&<button type="button" onClick={async()=>{await supabase.from("user_notifications" as any).update({read_at:new Date().toISOString()}).eq("id",n.id);await queryClient.invalidateQueries({queryKey:["user-notifications"]});}} className="rounded-lg border px-2 py-1 text-[10px] font-medium">Mark read</button>}</div></article>)}</div></section>}
      <h2 className="font-display text-lg font-semibold">Recent transactions</h2>
      <TransactionList limit={2} />
    </div>
  );
}
