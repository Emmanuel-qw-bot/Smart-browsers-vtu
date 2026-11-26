import { createFileRoute, notFound } from "@tanstack/react-router";
import { adminNav, findNav } from "@/config/navigation";
import { PageScaffold, EmptyPanel } from "@/components/shared/PageScaffold";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { WalletsTable, WelcomeBonusSettings } from "@/components/admin/WalletAdmin";
import { ProviderControl, providerControlQuery } from "@/components/admin/ProviderControl";
import { SupportSettings, supportSettingsQuery } from "@/components/admin/SupportSettings";
import { WeekendGiveawaySettings, weekendGiveawayQuery } from "@/components/admin/WeekendGiveawaySettings";
import { AnnouncementSettings } from "@/components/admin/AnnouncementSettings";
import { PendingBigisubTransactions } from "@/components/admin/PendingBigisubTransactions";
import { PendingVtuPurchaseMonitoring } from "@/components/admin/PendingVtuPurchaseMonitoring";
import { AdminAirtimeCash } from "@/components/admin/AdminAirtimeCash";
import { AdminReferralSettings } from "@/components/admin/AdminReferralSettings";
import { VendorSubscriptionSettings } from "@/components/admin/VendorSubscriptionSettings";

export const Route = createFileRoute("/_authenticated/admin/$section")({
  loader: async ({ params, context }) => {
    const item = findNav(adminNav, params.section);
    if (!item) throw notFound();
    if (params.section === "vtu-providers" || params.section === "products-pricing") await context.queryClient.ensureQueryData(providerControlQuery);
    if (params.section === "support-settings") await context.queryClient.ensureQueryData(supportSettingsQuery);
    if (params.section === "weekend-giveaways") await context.queryClient.ensureQueryData(weekendGiveawayQuery);
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
  if (slug === "wallet-management" || slug === "transactions") return <PageScaffold item={item} live><div className="space-y-5"><WalletsTable /><PendingVtuPurchaseMonitoring /><PendingBigisubTransactions /></div></PageScaffold>;
  if (slug === "welcome-bonus") return <PageScaffold item={item} live><WelcomeBonusSettings /></PageScaffold>;
  if (slug === "referral-settings") return <PageScaffold item={item} live><AdminReferralSettings /></PageScaffold>;
  if (slug === "support-settings") return <PageScaffold item={item} live><SupportSettings /></PageScaffold>;
  if (slug === "weekend-giveaways") return <PageScaffold item={item} live><WeekendGiveawaySettings /></PageScaffold>;
  if (slug === "announcements") return <PageScaffold item={item} live><AnnouncementSettings /></PageScaffold>;
  if (slug === "airtime-cash") return <PageScaffold item={item} live><AdminAirtimeCash /></PageScaffold>;
  if (slug === "vendor-subscriptions") return <PageScaffold item={item} live><VendorSubscriptionSettings /></PageScaffold>;
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
