import { useQuery } from "@tanstack/react-query";
import { getPendingVtuPurchases } from "@/lib/vtu.functions";

export function PendingVtuPurchaseMonitoring() {
  const query = useQuery({
    queryKey: ["admin", "pending-vtu-purchases"],
    queryFn: () => getPendingVtuPurchases(),
    refetchInterval: 30000,
  });
  const rows = query.data ?? [];
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
      <header>
        <h2 className="font-display text-lg font-semibold">VTU Transactions Needing Review</h2>
        <p className="mt-1 text-sm text-muted-foreground">These purchases may have been charged but have not reached a verified final status. Do not retry until the provider outcome is confirmed.</p>
      </header>
      {query.isLoading && <p className="text-sm text-muted-foreground">Loading review queue…</p>}
      {query.isError && <p className="text-sm text-destructive">Could not load review queue. {query.error instanceof Error ? query.error.message : ""}</p>}
      {!query.isLoading && !query.isError && rows.length === 0 && <p className="rounded-xl bg-muted p-3 text-sm">No unresolved VTU purchase records.</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <article key={row.reference} className="rounded-xl border p-3 space-y-1">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{row.service.toUpperCase()} · {row.network_name} · ₦{(Number(row.amount_kobo) / 100).toLocaleString("en-NG")}</strong>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{row.status}</span>
            </div>
            <p className="text-sm">Recipient: {row.phone}</p>
            <p className="break-all text-xs text-muted-foreground">Reference: {row.reference}</p>
            {row.provider_reference && <p className="break-all text-xs text-muted-foreground">Provider reference: {row.provider_reference}</p>}
            {row.provider_message && <p className="text-xs text-muted-foreground">{row.provider_message}</p>}
            <p className="text-xs text-muted-foreground">Submitted: {new Date(row.created_at).toLocaleString("en-NG")}</p>
            <p className="text-xs font-medium text-amber-700">Verify this recipient, amount and reference in the provider transaction history before making any refund or retry.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
