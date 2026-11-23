import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { customerNav, findNav } from "@/config/navigation";
import { PageScaffold } from "@/components/shared/PageScaffold";
import { AccountPanel } from "@/components/customer/AccountPanel";
import { BalanceCard, TransactionList, WalletPanel } from "@/components/customer/WalletPanel";
import { CustomerProducts } from "@/components/customer/CustomerProducts";
import { CustomerDataPlans } from "@/components/customer/CustomerDataPlans";
import { CustomerSupport, customerSupportQuery } from "@/components/customer/CustomerSupport";
import { CustomerWeekendRush, customerWeekendRushQuery } from "@/components/customer/CustomerWeekendRush";
import { CustomerAnnouncements, customerAnnouncementsQuery } from "@/components/customer/CustomerAnnouncements";
import { CustomerBadges } from "@/components/customer/CustomerBadges";
import { DashboardWelcome } from "@/components/customer/DashboardWelcome";
import { CustomerAirtimeCash } from "@/components/customer/CustomerAirtimeCash";
import { CustomerReferrals } from "@/components/customer/CustomerReferrals";
import { CustomerSquadRecharge } from "@/components/customer/CustomerSquadRecharge";
import { CustomerMiniShop } from "@/components/customer/CustomerMiniShop";
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

  if (slug === "mini-shop") return <PageScaffold item={item} live><CustomerMiniShop /></PageScaffold>;

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
      <CustomerAnnouncements />
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
            <Link key={q.slug} to="/app/$section" params={{ section: q.slug }} className={"flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-[11px] font-medium shadow-soft transition active:scale-95 " + style.tile}>
              <span className={"grid size-10 place-items-center rounded-xl " + style.icon}><q.icon className="size-5" /></span>
              {q.label}
            </Link>
          );
        })}
      </div>
      <h2 className="font-display text-lg font-semibold">Recent transactions</h2>
      <TransactionList limit={2} />
    </div>
  );
}
