import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCustomerProducts, purchaseAirtime, purchaseData } from "@/lib/vtu.functions";

type Product = {
  id: string;
  service: "data" | "airtime";
  network_name: string;
  plan_name: string;
  validity: string | null;
  selling_price_kobo: number | null;
  min_amount_kobo?: number | null;
  max_amount_kobo?: number | null;
};
type Recipient = {
  id: number;
  service: "data" | "airtime";
  network: string;
  phone: string;
  productId: string;
  amount: string;
};
type Result = { id: number; status: "success" | "refunded" | "pending" | "not_sent"; message: string };

const NETWORKS = [
  { name: "MTN", id: 1 },
  { name: "Airtel", id: 2 },
  { name: "Glo", id: 3 },
  { name: "9mobile", id: 4 },
];
const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;
const phoneIsValid = (value: string) => /^0\d{10}$/.test(value.replace(/\D/g, ""));

export function CustomerSquadRecharge() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [rows, setRows] = useState<Recipient[]>([{ id: 1, service: "data", network: "MTN", phone: "", productId: "", amount: "100" }]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    let alive = true;
    getCustomerProducts().then((res) => {
      if (!alive) return;
      const list = res.products as Product[];
      setProducts(list);
      setRows((prev) => prev.map((r) => {
        const first = list.find((p) => p.service === "data" && p.network_name.toLowerCase() === r.network.toLowerCase());
        return r.productId ? r : { ...r, productId: first?.id ?? "" };
      }));
    }).catch(() => { if (alive) setLoadError("Unable to load available plans. Refresh and try again."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const dataProducts = useMemo(() => products.filter((p) => p.service === "data" && p.selling_price_kobo != null), [products]);
  const totalKobo = useMemo(() => rows.reduce((sum, r) => {
    if (r.service === "data") {
      const p = dataProducts.find((x) => x.id === r.productId);
      return sum + (p?.selling_price_kobo ?? 0);
    }
    const n = Number(r.amount);
    return sum + (Number.isInteger(n) && n >= 50 ? n * 100 : 0);
  }, 0), [rows, dataProducts]);

  function updateRow(id: number, patch: Partial<Recipient>) {
    setRows((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.network && patch.network !== r.network && next.service === "data") {
        next.productId = dataProducts.find((p) => p.network_name.toLowerCase() === patch.network!.toLowerCase())?.id ?? "";
      }
      if (patch.service === "data") next.productId = dataProducts.find((p) => p.network_name.toLowerCase() === next.network.toLowerCase())?.id ?? "";
      return next;
    }));
  }
  function addRecipient() {
    if (rows.length >= 5) return;
    const id = Math.max(...rows.map((r) => r.id)) + 1;
    setRows((prev) => [...prev, { id, service: "data", network: "MTN", phone: "", productId: dataProducts.find((p) => p.network_name.toLowerCase() === "mtn")?.id ?? "", amount: "100" }]);
  }
  function removeRecipient(id: number) { if (rows.length > 1) setRows((prev) => prev.filter((r) => r.id !== id)); }

  function validate() {
    if (rows.length < 1 || rows.length > 5) return "Choose between 1 and 5 recipients.";
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!phoneIsValid(r.phone)) return `Recipient ${i + 1}: enter a valid 11-digit Nigerian phone number.`;
      if (r.service === "data" && !dataProducts.some((p) => p.id === r.productId && p.network_name.toLowerCase() === r.network.toLowerCase())) return `Recipient ${i + 1}: select an available data plan.`;
      if (r.service === "airtime" && (!Number.isInteger(Number(r.amount)) || Number(r.amount) < 50 || Number(r.amount) > 10000)) return `Recipient ${i + 1}: airtime amount must be ₦50–₦10,000.`;
    }
    return "";
  }

  async function processBatch() {
    if (busy) return;
    const invalid = validate();
    if (invalid) { toast.error(invalid); setConfirmOpen(false); return; }
    setBusy(true);
    setConfirmOpen(false);
    const finalResults: Result[] = [];
    setResults([]);
    for (const r of rows) {
      try {
        if (r.service === "data") {
          const plan = dataProducts.find((p) => p.id === r.productId)!;
          const res = await purchaseData({ data: { productId: plan.id, phone: r.phone.trim() } });
          finalResults.push({ id: r.id, status: "success", message: res.message });
        } else {
          const networkId = NETWORKS.find((n) => n.name.toLowerCase() === r.network.toLowerCase())?.id ?? 0;
          const res = await purchaseAirtime({ data: { networkId, networkName: r.network, phone: r.phone.trim(), amountNaira: Number(r.amount) } });
          finalResults.push({ id: r.id, status: "success", message: res.message });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Purchase outcome needs review.";
        const status: Result["status"] = message.startsWith("REFUNDED:") ? "refunded" : message.startsWith("PENDING:") || message.toLowerCase().includes("uncertain") || message.toLowerCase().includes("do not retry") ? "pending" : "not_sent";
        finalResults.push({ id: r.id, status, message });
        // Stop after any failure/uncertain response so the customer can review before more debits.
        for (const remaining of rows.slice(rows.indexOf(r) + 1)) finalResults.push({ id: remaining.id, status: "not_sent", message: "Not submitted because an earlier recipient needs attention." });
        break;
      }
      setResults([...finalResults]);
    }
    setResults(finalResults);
    setBusy(false);
    await qc.invalidateQueries({ queryKey: ["wallet"] });
    await qc.invalidateQueries({ queryKey: ["customer-purchase-badges"] });
    await qc.invalidateQueries({ queryKey: ["admin", "ledger"] });
    const successes = finalResults.filter((x) => x.status === "success").length;
    if (successes) toast.success(`${successes} recharge(s) submitted successfully.`);
    if (finalResults.some((x) => x.status === "pending")) toast.warning("A recipient has an uncertain result. Do not retry that recharge yet.");
  }

  return (
    <section className="space-y-4">
      <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/75 p-5 text-primary-foreground shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Squad Recharge</p>
        <h2 className="mt-1 text-xl font-bold">Recharge your people in one go</h2>
        <p className="mt-2 text-sm opacity-90">Send data or airtime to up to 5 recipients. Review the batch and confirm once.</p>
      </div>
      {loadError && <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{loadError}</div>}
      {loading ? <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">Loading plans…</div> : (
        <div className="space-y-3">
          {rows.map((r, index) => {
            const plans = dataProducts.filter((p) => p.network_name.toLowerCase() === r.network.toLowerCase());
            const selected = plans.find((p) => p.id === r.productId);
            const price = r.service === "data" ? selected?.selling_price_kobo ?? 0 : (Number(r.amount) || 0) * 100;
            return (
              <article key={r.id} className="rounded-2xl border bg-card p-4 shadow-soft space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Recipient {index + 1}</h3>
                  {rows.length > 1 && <button type="button" onClick={() => removeRecipient(r.id)} className="text-xs text-destructive">Remove</button>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs font-medium">Recharge type
                    <select value={r.service} onChange={(e) => updateRow(r.id, { service: e.target.value as Recipient["service"] })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm">
                      <option value="data">Data</option><option value="airtime">Airtime</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium">Network
                    <select value={r.network} onChange={(e) => updateRow(r.id, { network: e.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm">
                      {NETWORKS.map((n) => <option key={n.name} value={n.name}>{n.name}</option>)}
                    </select>
                  </label>
                </div>
                {r.service === "data" ? (
                  <label className="text-xs font-medium">Data bundle
                    <select value={r.productId} onChange={(e) => updateRow(r.id, { productId: e.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm">
                      <option value="">Select bundle</option>
                      {plans.map((p) => <option key={p.id} value={p.id}>{p.plan_name}{p.validity ? ` · ${p.validity}` : ""} — {p.selling_price_kobo == null ? "Price unavailable" : naira(p.selling_price_kobo)}</option>)}
                    </select>
                  </label>
                ) : (
                  <label className="text-xs font-medium">Airtime amount (₦)
                    <input type="number" min="50" max="10000" step="50" value={r.amount} onChange={(e) => updateRow(r.id, { amount: e.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
                  <span className="mt-1 block text-muted-foreground">₦50–₦10,000</span>
                  </label>
                )}
                <label className="text-xs font-medium">Recipient phone number
                  <input type="tel" inputMode="numeric" placeholder="08012345678" value={r.phone} onChange={(e) => updateRow(r.id, { phone: e.target.value })} className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm" />
                <span className="mt-1 block text-muted-foreground">Check the number carefully before submitting.</span>
                </label>
                <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2 text-sm"><span>Recipient cost</span><strong>{naira(price)}</strong></div>
              </article>
            );
          })}
          <button type="button" disabled={rows.length >= 5} onClick={addRecipient} className="w-full rounded-xl border border-dashed px-4 py-3 text-sm font-semibold disabled:opacity-40">+ Add recipient ({rows.length}/5)</button>
          <div className="rounded-2xl border bg-card p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Recipients</span><strong>{rows.length}</strong></div>
            <div className="flex justify-between text-lg font-bold"><span>Estimated total</span><span>{naira(totalKobo)}</span></div>
            <p className="text-xs text-muted-foreground">Each recharge is submitted individually in sequence. If a request fails or its status is uncertain, the batch stops and remaining recipients are not submitted.</p>
            <button type="button" disabled={busy || loading || !!loadError} onClick={() => { const issue = validate(); if (issue) toast.error(issue); else setConfirmOpen(true); }} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Processing batch…" : "Review & confirm batch"}</button>
          </div>
        </div>
      )}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Confirm Squad Recharge</h3>
            <p className="text-sm text-muted-foreground">You are about to submit {rows.length} recharge(s), with an estimated total of <strong className="text-foreground">{naira(totalKobo)}</strong>. Each request is charged separately from your wallet. Some completed recharges cannot be undone.</p>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {rows.map((r, i) => {
                const p = dataProducts.find((x) => x.id === r.productId);
                return <div key={r.id} className="rounded-lg bg-muted p-2 text-sm"><strong>{i + 1}. {r.network}</strong> · {r.service === "data" ? p?.plan_name ?? "Data plan" : `₦${r.amount} airtime`}<br/><span className="text-muted-foreground">{r.phone}</span></div>;
              })}
            </div>
            <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setConfirmOpen(false)} className="rounded-xl border px-3 py-2.5 font-medium">Go back</button><button type="button" disabled={busy} onClick={processBatch} className="rounded-xl bg-primary px-3 py-2.5 font-semibold text-primary-foreground">{busy ? "Submitting…" : "Confirm & recharge"}</button></div>
          </div>
        </div>
      )}
      {results.length > 0 && (
        <div className="rounded-2xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Batch results</h3>
          {results.map((result, index) => (
            <div key={result.id} className="rounded-xl border p-3 text-sm space-y-1">
              <div className="flex items-center justify-between gap-2"><strong>Recipient {index + 1}</strong><span className={result.status === "success" ? "text-emerald-600" : result.status === "pending" ? "text-amber-600" : result.status === "refunded" ? "text-sky-600" : "text-muted-foreground"}>{result.status === "success" ? "Submitted" : result.status === "pending" ? "Needs review" : result.status === "refunded" ? "Refunded" : "Not sent"}</span></div>
              <p className="break-words text-muted-foreground">{result.message}</p>
            </div>
          ))}
          {results.some((r) => r.status === "pending") && <p className="text-sm font-medium text-amber-600">Do not retry recipients with an uncertain status until Support confirms the outcome.</p>}
        </div>
      )}
    </section>
  );
}
