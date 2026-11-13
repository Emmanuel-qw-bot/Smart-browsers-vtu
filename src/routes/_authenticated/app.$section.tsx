import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { customerNav, findNav } from "@/config/navigation";
import { PageScaffold } from "@/components/shared/PageScaffold";
import { AccountPanel } from "@/components/customer/AccountPanel";
import { BalanceCard, TransactionList, WalletPanel } from "@/components/customer/WalletPanel";
import { CustomerProducts } from "@/components/customer/CustomerProducts";
export const Route = createFileRoute("/_authenticated/app/$section")({
  loader: ({ params }) => {
    const item = findNav(customerNav, params.section);
    if (!item) throw notFound();
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

          if (slug === "buy-data") {
            return (
                <PageScaffold item={item} live>
                      <CustomerProducts service="data" />
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
      <TransactionList limit={5} />
    </PageScaffold>
  );
}
