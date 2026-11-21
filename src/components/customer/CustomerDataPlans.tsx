import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCustomerProducts, purchaseData } from "@/lib/vtu.functions";

type DataProduct = {
  id: string;
  service: "data";
  network_name: string;
  plan_name: string;
  validity: string | null;
  selling_price_kobo: number | null;
};

const NETWORKS = ["All", "MTN", "Airtel", "GLO", "9mobile"];

const networkStyles: Record<string, string> = {
  MTN: "border-yellow-400 bg-yellow-50 text-yellow-900",
  Airtel: "border-red-300 bg-red-50 text-red-700",
  GLO: "border-green-300 bg-green-50 text-green-800",
  "9mobile": "border-lime-300 bg-lime-50 text-lime-800",
};

export function CustomerDataPlans() {
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [network, setNetwork] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const [recipientPhone, setRecipientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  function handlePurchase() {
    if (!selected) return;
    const cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith("0")) {
      toast.error("Enter a valid Nigerian phone number (e.g. 08012345678).");
      return;
    }
    setConfirmationOpen(true);
  }

  async function confirmPurchase() {
    if (!selected || !confirmationOpen || submitting) return;
    setSubmitting(true);
    try {
      const res = await purchaseData({ data: { productId: selected.id, phone: recipientPhone.trim() } });
      toast.success(res.message);
      setRecipientPhone("");
      setConfirmationOpen(false);
      await qc.invalidateQueries({ queryKey: ["wallet"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    let active = true;
    getCustomerProducts()
      .then((result) => {
        if (active) {
          const dataProducts = result.products.filter(
            (product) => product.service === "data"
          ) as DataProduct[];
          setProducts(dataProducts);
          setSelectedId(dataProducts[0]?.id ?? null);
        }
      })
      .catch(() => {
        if (active) setError("We couldn't load data plans. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          network === "All" ||
          product.network_name.toLowerCase() === network.toLowerCase()
      ),
    [products, network]
  );

  const selected = visibleProducts.find((product) => product.id === selectedId);
  const formatPrice = (kobo: number | null) =>
    kobo === null
      ? "Price unavailable"
      : `₦${(kobo / 100).toLocaleString("en-NG")}`;

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary/75 p-5 text-primary-foreground shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Smart Browsers data store</p>
        <h2 className="mt-2 font-display text-2xl font-bold">Stay connected for less.</h2>
        <p className="mt-1 max-w-sm text-sm opacity-85">Choose your network and find a bundle that works for you.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/15 px-3 py-1.5">MTN</span>
          <span className="rounded-full bg-white/15 px-3 py-1.5">Airtel</span>
          <span className="rounded-full bg-white/15 px-3 py-1.5">Glo</span>
          <span className="rounded-full bg-white/15 px-3 py-1.5">9mobile</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Choose a network</h3>
          <p className="text-sm text-muted-foreground">Select a provider to view its available bundles.</p>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {NETWORKS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setNetwork(name)}
              className={`rounded-xl border px-2 py-3 text-xs font-semibold transition-all ${network === name ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">Available data plans</h3>
            <p className="text-sm text-muted-foreground">Tap a plan to review it.</p>
          </div>
          {!loading && <span className="text-xs text-muted-foreground">{visibleProducts.length} plans</span>}
        </div>

        {loading && <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading data plans…</div>}
        {error && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
        {!loading && !error && visibleProducts.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
            <h4 className="font-semibold">No bundles available yet</h4>
            <p className="mt-1 text-sm text-muted-foreground">There are no active data plans for this network right now.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {visibleProducts.map((product) => {
            const active = product.id === selectedId;
            return (
              <button
                key={product.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedId(product.id)}
                className={`rounded-2xl border p-4 text-left transition-all ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${networkStyles[product.network_name] ?? "border-border bg-muted text-foreground"}`}>{product.network_name}</span>
                  {active && <span className="text-xs font-semibold text-primary">Selected</span>}
                </div>
                <p className="mt-4 font-display text-xl font-bold">{product.plan_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{product.validity || "Validity not specified"}</p>
                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-muted-foreground">Bundle price</span>
                  <span className="text-lg font-bold">{formatPrice(product.selling_price_kobo)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your selection</p>
              <p className="mt-1 font-semibold">{selected.network_name} · {selected.plan_name}</p>
              <p className="text-sm text-muted-foreground">{selected.validity || "Validity not specified"}</p>
            </div>
            <p className="text-xl font-bold">{formatPrice(selected.selling_price_kobo)}</p>
          </div>
          <div>
            <label htmlFor="recipient-phone" className="text-xs font-semibold uppercase text-muted-foreground">Recipient Phone Number</label>
            <input id="recipient-phone" type="tel" inputMode="tel" placeholder="e.g. 08012345678" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button type="button" disabled={submitting || !recipientPhone} onClick={handlePurchase} className="h-12 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Processing..." : "Review purchase"}
          </button>
        </div>
      )}
      {confirmationOpen && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="data-purchase-confirm-title" className="w-full max-w-md space-y-4 rounded-2xl border bg-card p-5 shadow-2xl">
            <h2 id="data-purchase-confirm-title" className="text-lg font-bold">Confirm your data purchase</h2>
            <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
              <p><span className="text-muted-foreground">Network:</span> <strong>{selected.network_name}</strong></p>
              <p><span className="text-muted-foreground">Plan:</span> <strong>{selected.plan_name}</strong></p>
              <p><span className="text-muted-foreground">Recipient:</span> <strong>{recipientPhone}</strong></p>
              <p><span className="text-muted-foreground">Price:</span> <strong>{formatPrice(selected.selling_price_kobo)}</strong></p>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-300">⚠️ Check the phone number carefully.</p>
              <p className="mt-1">Data sent to a wrong number may not be recoverable. Smart Browsers cannot guarantee reversal of an incorrect recipient number.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={submitting} onClick={() => setConfirmationOpen(false)} className="rounded-xl border px-4 py-3 font-medium disabled:opacity-50">Cancel</button>
              <button type="button" disabled={submitting} onClick={confirmPurchase} className="rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{submitting ? "Processing..." : `Confirm & Pay ${formatPrice(selected.selling_price_kobo)}`}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
