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

        if (slug === "transactions") {
          return <PageScaffold item={item} live><TransactionList limit={200} /></PageScaffold>;
          }

          if (slug === "weekend-rush") {
    return <PageScaffold item={item} live><CustomerWeekendRush /></PageScaffold>;
  }

          if (slug === "support") {
    return <PageScaffold item={item} live><CustomerSupport /></PageScaffold>;
  }

  if (slug === "buy-data") {
    return (
      <PageScaffold item={item} live>
        <CustomerDataPlans />
      </PageScaffold>
    );
  }

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
  const quick = customerNav.filter((n) => ["buy-data", "buy-airtime", "airtime-to-cash", "wallet", "rewards", "referrals", "weekend-rush", "support"].includes(n.slug));
  return (
    <PageScaffold item={item} live>
      <CustomerAnnouncements />
      <BalanceCard />
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {quick.map((q) => (
          <Link key={q.slug} to="/app/$section" params={{ section: q.slug }} className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-center text-[11px] font-medium shadow-soft transition active:scale-95">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><q.icon className="size-5" /></span>
            {q.label}
          </Link>
        ))}
      </div>
      <h2 className="font-display text-lg font-semibold">Recent transactions</h2>
      <TransactionList limit={2} />
    </PageScaffold>
  );
}
