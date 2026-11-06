import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormMessage } from "@/components/auth/AuthLayout";
import { CATEGORY_LABELS, bonusSettingsQuery, formatNaira, nairaToKobo } from "@/lib/wallet";

/** Admin-only by database policy: non-admins get no rows. */
export function WalletsTable() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "ledger"],
    queryFn: async () => {
      const [w, t, p] = await Promise.all([
        supabase.from("wallets").select("user_id, balance_kobo").order("balance_kobo", { ascending: false }).limit(200),
        supabase.from("wallet_transactions").select("id, user_id, category, amount_kobo, balance_after_kobo, reference, description, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("profiles").select("id, full_name, email").limit(1000),
      ]);
      if (w.error) throw w.error;
      if (t.error) throw t.error;
      if (p.error) throw p.error;
      const names = new Map(p.data.map((x) => [x.id, x.full_name || x.email]));
      return { wallets: w.data, txns: t.data, names };
    },
  });
  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  if (error || !data) return <FormMessage>Couldn't load wallets.</FormMessage>;
  return (
    <div className="space-y-5">
      <section className="overflow-x-auto rounded-2xl bg-card shadow-soft">
        <h2 className="px-4 pt-4 font-display font-semibold">Customer balances</h2>
        <table className="mt-2 w-full text-left text-sm">
          <tbody>{data.wallets.map((w) => (
            <tr key={w.user_id} className="border-t"><td className="px-4 py-3">{data.names.get(w.user_id) ?? w.user_id}</td><td className="px-4 py-3 text-right font-semibold">{formatNaira(w.balance_kobo)}</td></tr>
          ))}</tbody>
        </table>
      </section>
      <section className="overflow-x-auto rounded-2xl bg-card shadow-soft">
        <h2 className="px-4 pt-4 font-display font-semibold">Ledger (latest 100)</h2>
        {!data.txns.length ? <p className="p-4 text-sm text-muted-foreground">No ledger entries yet.</p> : (
          <table className="mt-2 w-full min-w-[720px] text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground"><tr>{["When", "Customer", "Type", "Amount", "Balance after", "Reference"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{data.txns.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2">{new Date(t.created_at).toLocaleString("en-NG")}</td>
                <td className="px-4 py-2">{data.names.get(t.user_id) ?? "—"}</td>
                <td className="px-4 py-2">{CATEGORY_LABELS[t.category]}</td>
                <td className="px-4 py-2">{formatNaira(t.amount_kobo)}</td>
                <td className="px-4 py-2">{formatNaira(t.balance_after_kobo)}</td>
                <td className="px-4 py-2 font-mono text-xs">{t.reference}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export function WelcomeBonusSettings() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(bonusSettingsQuery);
  const [enabled, setEnabled] = useState(true);
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (data) { setEnabled(data.enabled); setAmount(String(data.amount_kobo / 100)); }
  }, [data]);

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  if (error || !data) return <FormMessage>Couldn't load bonus settings.</FormMessage>;

  async function save() {
    const kobo = nairaToKobo(amount);
    if (kobo === null) { toast.error("Enter an amount between ₦0.01 and ₦100,000."); return; }
    setSaving(true);
    const { data: rows, error } = await supabase.from("welcome_bonus_settings").update({ enabled, amount_kobo: kobo }).eq("id", true).select("id");
    setSaving(false);
    if (error || !rows?.length) { toast.error("Couldn't save — admin permission required."); return; }
    toast.success("Welcome bonus settings saved");
    await qc.invalidateQueries({ queryKey: bonusSettingsQuery.queryKey });
  }

  return (
    <div className="space-y-4 rounded-2xl bg-card p-5 shadow-soft">
      <label className="flex items-center justify-between gap-4">
        <span><span className="font-medium">Welcome bonus active</span><span className="block text-xs text-muted-foreground">Turning it off only stops new bonuses; bonuses already credited stay.</span></span>
        <input type="checkbox" className="size-5 accent-[var(--color-primary)]" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Bonus amount (₦)</span>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5" />
      </label>
      <p className="text-xs text-muted-foreground">Credited exactly once per customer after successful email verification. SMS verification is not required.</p>
      <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button>
      <p className="text-[11px] text-muted-foreground">Last changed {new Date(data.updated_at).toLocaleString("en-NG")}</p>
    </div>
  );
}
