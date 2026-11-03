import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Eye } from "lucide-react";
import { customerNav, findNav } from "@/config/navigation";
import { PageScaffold, EmptyPanel } from "@/components/shared/PageScaffold";

export const Route = createFileRoute("/app/$section")({
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
  if (slug !== "dashboard") return <PageScaffold item={item} />;

  const quick = customerNav.filter((n) => ["buy-data", "buy-airtime", "airtime-to-cash", "wallet", "rewards", "referrals", "weekend-rush", "support"].includes(n.slug));
  return (
    <PageScaffold item={item}>
      <div className="rounded-3xl bg-brand p-6 text-primary-foreground shadow-brand">
        <p className="flex items-center gap-2 text-sm opacity-85"><Eye className="size-4" /> Wallet balance</p>
        <p className="mt-2 font-display text-4xl font-bold">₦ —</p>
        <p className="mt-1 text-xs opacity-75">Balance appears here once your account is live.</p>
        <Link to="/app/$section" params={{ section: "wallet" }} className="mt-5 inline-block rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-primary-deep">Fund wallet</Link>
      </div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
        {quick.map((q) => (
          <Link key={q.slug} to="/app/$section" params={{ section: q.slug }} className="flex flex-col items-center gap-2 rounded-2xl bg-card p-3 text-center text-[11px] font-medium shadow-soft transition active:scale-95">
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground"><q.icon className="size-5" /></span>
            {q.label}
          </Link>
        ))}
      </div>
      <EmptyPanel title="Recent transactions" hint="You haven't made any transactions yet." />
    </PageScaffold>
  );
}
