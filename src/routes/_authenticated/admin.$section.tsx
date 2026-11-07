import { createFileRoute, notFound } from "@tanstack/react-router";
import { adminNav, findNav } from "@/config/navigation";
import { PageScaffold, EmptyPanel } from "@/components/shared/PageScaffold";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { WalletsTable, WelcomeBonusSettings } from "@/components/admin/WalletAdmin";
import { ProviderControl, providerControlQuery } from "@/components/admin/ProviderControl";

export const Route = createFileRoute("/_authenticated/admin/$section")({
  loader: async ({ params, context }) => {
    const item = findNav(adminNav, params.section);
    if (!item) throw notFound();
    if (params.section === "vtu-providers" || params.section === "products-pricing") await context.queryClient.ensureQueryData(providerControlQuery);
    return { slug: item.slug };
  },
  head: ({ loaderData }) => {
    const item = loaderData ? findNav(adminNav, loaderData.slug) : undefined;
    const title = `${item?.label ?? "Admin"} — Smart Browsers Admin`;
    return {
      meta: [
        { title },
        { name: "description", content: item?.description ?? "Admin Control Centre" },
        { property: "og:title", content: title },
        { property: "og:description", content: item?.description ?? "Admin Control Centre" },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: AdminSection,
});

function AdminSection() {
  const { slug } = Route.useLoaderData();
  const item = findNav(adminNav, slug);
  if (!item) throw notFound();
  if (slug === "vtu-providers" || slug === "products-pricing") return <PageScaffold item={item} live><ProviderControl /></PageScaffold>;
  if (slug === "customers") return <PageScaffold item={item} live><CustomersTable /></PageScaffold>;
  if (slug === "wallet-management" || slug === "transactions") return <PageScaffold item={item} live><WalletsTable /></PageScaffold>;
  if (slug === "welcome-bonus") return <PageScaffold item={item} live><WelcomeBonusSettings /></PageScaffold>;
  if (slug !== "overview") return <PageScaffold item={item} />;
  return (
    <PageScaffold item={item}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["Customers", "Revenue today", "Transactions today", "Provider balance"].map((k) => (
          <div key={k} className="rounded-2xl bg-card p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{k}</p>
            <p className="mt-2 font-display text-2xl font-semibold">—</p>
            <p className="text-[11px] text-muted-foreground">Not connected</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <EmptyPanel title="Revenue trend" hint="Charts will appear when real transactions exist." />
        <EmptyPanel title="Latest activity" hint="No activity recorded." />
      </div>
    </PageScaffold>
  );
}
