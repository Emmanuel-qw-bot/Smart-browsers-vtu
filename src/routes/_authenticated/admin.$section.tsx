import { createFileRoute, notFound } from "@tanstack/react-router";
import { adminNav, findNav } from "@/config/navigation";
import { PageScaffold, EmptyPanel } from "@/components/shared/PageScaffold";
import { CustomersTable } from "@/components/admin/CustomersTable";

export const Route = createFileRoute("/_authenticated/admin/$section")({
  loader: ({ params }) => {
    const item = findNav(adminNav, params.section);
    if (!item) throw notFound();
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
      ],
    };
  },
  component: AdminSection,
});

function AdminSection() {
  const { slug } = Route.useLoaderData();
  const item = findNav(adminNav, slug)!;
  if (slug === "customers") return <PageScaffold item={item} live><CustomersTable /></PageScaffold>;
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
