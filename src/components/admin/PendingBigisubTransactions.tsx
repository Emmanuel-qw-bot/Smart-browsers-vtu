import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPendingBigisubAirtime,
  registerPendingFromWalletReference,
  attachBigisubTransactionId,
  requeryBigisubAirtime,
} from "@/lib/vtu.functions";

export function PendingBigisubTransactions() {
  const qc = useQueryClient();
  const [oldReference, setOldReference] = useState("");
  const [providerIds, setProviderIds] = useState<Record<string, string>>({});
  const pendingQuery = useQuery({
    queryKey: ["admin", "bigisub-pending-airtime"],
    queryFn: () => getPendingBigisubAirtime(),
    refetchInterval: 20000,
  });

  const importMutation = useMutation({
    mutationFn: (reference: string) => registerPendingFromWalletReference({ data: { reference } }),
    onSuccess: async () => {
      toast.success("Pending purchase added for reconciliation.");
      setOldReference("");
      await qc.invalidateQueries({ queryKey: ["admin", "bigisub-pending-airtime"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add pending purchase."),
  });
  const attachMutation = useMutation({
    mutationFn: ({ reference, providerTransactionId }: { reference: string; providerTransactionId: string }) =>
      attachBigisubTransactionId({ data: { reference, providerTransactionId } }),
    onSuccess: async (_, vars) => {
      toast.success("Provider transaction ID saved.");
      await qc.invalidateQueries({ queryKey: ["admin", "bigisub-pending-airtime"] });
      setProviderIds((prev) => ({ ...prev, [vars.reference]: "" }));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save ID."),
  });
  const requeryMutation = useMutation({
    mutationFn: (reference: string) => requeryBigisubAirtime({ data: { reference } }),
    onSuccess: async (result) => {
      toast.success(`Status: ${result.status}. ${result.message}`);
      await qc.invalidateQueries({ queryKey: ["admin", "bigisub-pending-airtime"] });
      await qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Status check failed."),
  });

  const rows = pendingQuery.data ?? [];
  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4 shadow-soft">
      <header>
        <h2 className="font-display text-lg font-semibold">Pending Bigisub Airtime</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Do not repeat a pending purchase. Import older references, add the provider transaction ID from the Bigisub transaction record, then recheck.
        </p>
      </header>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (oldReference.trim()) importMutation.mutate(oldReference.trim()); }}>
        <input value={oldReference} onChange={(e) => setOldReference(e.target.value)} placeholder="Import an existing AIR- reference" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm" />
        <button disabled={!oldReference.trim() || importMutation.isPending} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {importMutation.isPending ? "Adding…" : "Import reference"}
        </button>
      </form>
      {pendingQuery.isLoading && <p className="text-sm text-muted-foreground">Loading pending records…</p>}
      {pendingQuery.isError && <p className="text-sm text-destructive">Could not load records. {pendingQuery.error instanceof Error ? pendingQuery.error.message : ""}</p>}
      {!pendingQuery.isLoading && rows.length === 0 && <p className="rounded-xl bg-muted p-3 text-sm">No pending Bigisub airtime transactions.</p>}
      <div className="space-y-3">
        {rows.map((row) => (
          <article key={row.reference} className="space-y-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{row.network_name} · ₦{row.amount_naira} · {row.phone}</p>
                <p className="break-all text-xs text-muted-foreground">{row.reference}</p>
                <p className="text-xs text-muted-foreground">Created {new Date(row.created_at).toLocaleString("en-NG")}</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">{row.status}</span>
            </div>
            {row.provider_transaction_id ? (
              <p className="break-all text-sm"><span className="text-muted-foreground">Provider ID:</span> {row.provider_transaction_id}</p>
            ) : (
              <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); const value = providerIds[row.reference]?.trim(); if (value) attachMutation.mutate({ reference: row.reference, providerTransactionId: value }); }}>
                <input value={providerIds[row.reference] ?? ""} onChange={(e) => setProviderIds((prev) => ({ ...prev, [row.reference]: e.target.value }))} placeholder="Bigisub transaction ID" className="min-w-0 flex-1 rounded-xl border bg-background px-3 py-2 text-sm" />
                <button disabled={!providerIds[row.reference]?.trim() || attachMutation.isPending} className="rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-50">Save ID</button>
              </form>
            )}
            {row.provider_message && <p className="text-xs text-muted-foreground">{row.provider_message}</p>}
            <button disabled={!row.provider_transaction_id || requeryMutation.isPending} onClick={() => requeryMutation.mutate(row.reference)} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {requeryMutation.isPending ? "Checking…" : "Recheck status"}
            </button>
            <p className="text-xs text-muted-foreground">Status rechecks are rate-limited by Bigisub. Wait at least 30 seconds between checks.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
