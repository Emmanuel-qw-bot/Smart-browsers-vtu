import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { FormMessage } from "@/components/auth/AuthLayout";
import { CATEGORY_LABELS, bonusSettingsQuery, formatNaira, nairaToKobo } from "@/lib/wallet";
import { adjustCustomerWallet } from "@/lib/vtu.functions";

interface CustomerOption {
  id: string;
    label: string;
    }
    function ManualFundingCard({
          customers,
            onComplete,
            }: {
              customers: CustomerOption[];
                onComplete: () => void;
                }) {
                  const [userId, setUserId] = useState<string>(customers[0]?.id || "");
                    const [action, setAction] = useState<"credit" | "debit">("credit");
                      const [category, setCategory] = useState<"deposit" | "promotional" | "reward">("deposit");
                        const [amount, setAmount] = useState<string>("");
                          const [note, setNote] = useState<string>("");
                            const [submitting, setSubmitting] = useState<boolean>(false);

                              useEffect(() => {
    if (!userId && customers.length > 0) {
              setUserId(customers[0].id);
                  }
                    }, [customers, userId]);

                      async function handleSubmit(e: React.FormEvent) {
                          e.preventDefault();
                              const numAmount = parseFloat(amount);
                                  if (!userId) {
                                        toast.error("Please select a customer.");
                                              return;
                                                  }
                                                      if (!numAmount || numAmount <= 0) {
                                                            toast.error("Enter a valid amount greater than 0.");
                                                                  return;
                                                      }             
                            if (!note.trim()) {
                                  toast.error("Please provide a note or reason for this adjustment.");
                                        return;
                                            }

                                                setSubmitting(true);
                                                    try {
                                                          await adjustCustomerWallet({
                                                                  data: {
                                                                            userId,
                                                                                      category,
                                                                                                amountNaira: numAmount,
                                                                                                          action,
                                                                                                                    description: note.trim(),
                                                                                                                            },
                                                                                                                        });
                toast.success(
                            `Successfully ${action === "credit" ? "credited" : "debited"} ₦${numAmount.toLocaleString()}!`
                                  );
                                        setAmount("");
                                              setNote("");
                                                    onComplete();
                                                        } catch (err: unknown) {
                                                              const msg = err instanceof Error ? err.message : "Failed to adjust wallet.";
                                                                    toast.error(msg);
                                                                        } finally {
                                                                              setSubmitting(false);
                                                                        }
                                                                    }
                                                                    return (
                                                                            <section className="rounded-2xl bg-card p-5 shadow-soft border border-border">
                                                                                  <div className="mb-4">
                                                                                          <h3 className="font-display font-semibold text-base text-foreground">
                                                                                                    Manual Wallet Adjustment
                                                                                                            </h3>
                                                                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                                                                              Credit or debit any customer wallet directly. Every transaction is permanently recorded in the ledger.
                                                                                                                                      </p>
                                                                                                                                            </div>
                                                                                                                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                                                                                                                    <div>
                                                                                                                                                              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                                                                                                                                          SELECT CUSTOMER
                                                                                                                                                                                    </label>
                                                                                                                                                                                              <select
                                                                                                                                                                                                          value={userId}
                                                                                                                                                                                                                      onChange={(e) => setUserId(e.target.value)}
                                                                                                                                                                                                                                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                                                                                                                                                                            >
                                                                                                                                                                                                                                                        {customers.map((c) => (
                                                                                                                                                                                                                                                                      <option key={c.id} value={c.id}>
                                                                                                                                                                                                                                                                                      {c.label}
                                                                                                                                                                                                                                                                                                    </option>
                                                                                                                                                                                                                                                                                                                ))}
                                                                                                                                                                                                                                                                                                                          </select>
                                                                                                                                                                                                                                                                                                                                  </div>
                                                                                            <div className="grid grid-cols-2 gap-3">
                                                                                                          <div>
                                                                                                                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                                                                                                    ACTION
                                                                                                                                                </label>
                                                                                                                                                            <select
                                                                                                                                                                          value={action}
                                                                                                                                                                                        onChange={(e) => setAction(e.target.value as "credit" | "debit")}
                                                                                                                                                                                                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                                                                                                                                                  >
                                                                                                                                                                                                                                <option value="credit">Credit (+) Add funds</option>
                                                                                                                                                                                                                                              <option value="debit">Debit (-) Deduct funds</option>
                                                                                                                                                                                                                                                          </select>
                                                                                                                                                                                                                                                            </div>
                                                                                                    <div>
                                                                                                                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                                                                                                  CATEGORY
                                                                                                                                              </label>
                                                                                                                                                          <select
                                                                                                                                                                        value={category}
                                                                                                                                                                                      onChange={(e) => setCategory(e.target.value as "deposit" | "promotional" | "reward")}
                                                                                                                                                                                                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                                                                                                                                                >
                                                                                                                                                                                                                              <option value="deposit">Deposit (Cash Funding)</option>
                                                                                                                                                                                                                                            <option value="promotional">Promotional</option>
                                                                                                                                                                                                                                                          <option value="reward">Reward</option>
                                                                                                                                                                                                                                                                      </select>
                                                                                                                                                                                                                                                                                </div>
                                                                                                                                                                                                                                                                                        </div>
                                                                                                <div>
                                                                                                              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                                                                                          AMOUNT (₦)
                                                                                                                                    </label>
                                                                                                                                              <input
                                                                                                                                                          type="number"
                                                                                                                                                                      min="1"
                                                                                                                                                                                  step="any"
                                                                                                                                                                                              value={amount}
                                                                                                                                                                                                          onChange={(e) => setAmount(e.target.value)}
                                                                                                                                                                                                                      placeholder="e.g. 500 or 1000"
                                                                                                                                                                                                                                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                                                                                                                                                                            />
                                                                                                                                                                                                                                                    </div>
                                                                                          <div>
                                                                                                      <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                                                                                                  REASON / AUDIT NOTE
                                                                                                                            </label>
                                                                                                                                      <input
                                                                                                                                                  type="text"
                                                                                                                                                              value={note}
                                                                                                                                                                          onChange={(e) => setNote(e.target.value)}
                                                                                                                                                                                      placeholder="e.g. Manual bank transfer verified"
                                                                                                                                                                                                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                                                                                                                                                                            />
                                                                                                                                                                                                                    </div>
                                                                                        <button
                                                                                                  type="submit"
                                                                                                            disabled={submitting}
                                                                                                                      className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                                                                                                                              >
                                                                                                                                        {submitting
                                                                                                                                                    ? "Processing..."
                                                                                                                                                                : `${action === "credit" ? "Credit" : "Debit"} Customer Wallet`}
                                                                                                                                                                        </button>
                                                                                                                                                                              </form>
                                                                                                                                                                                  </section>
                                                                                                                                                                                    );
                                                                                                                                                                                    }      
                                                                                        /** Admin-only by database policy: non-admins get no rows. */
                                                                                        export function WalletsTable() {
                                                                                          const qc = useQueryClient();
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
                                                                                                                const customerList: CustomerOption[] = p.data.map((x) => ({
                                                                                                                        id: x.id,
                                                                                                                                label: `${x.full_name || "Customer"} (${x.email})`,
                                                                                                                                      }));
                                                                                                                                            return { wallets: w.data, txns: t.data, names, customerList };
                                                                                                                                                },
                                                                                                                                                  });
                                                                                        if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
                                                                                          if (error || !data) return <FormMessage>Couldn't load wallets.</FormMessage>;

                                                                                            return (
                                                                                                <div className="space-y-6">
                                                                                                      <ManualFundingCard
                                                                                                              customers={data.customerList}
                                                                                                                      onComplete={() => qc.invalidateQueries({ queryKey: ["admin", "ledger"] })}
                                                                                                                            />
                                                                                         <section className="overflow-x-auto rounded-2xl bg-card shadow-soft">
                                                                                                    <h2 className="px-4 pt-4 font-display font-semibold">Customer balances</h2>
                                                                                                            <table className="w-full text-left text-sm">
                                                                                                                      <thead className="border-b text-xs uppercase text-muted-foreground">
                                                                                                                                  <tr>
                                                                                                                                                <th className="px-4 py-3">Customer</th>
                                                                                                                                                              <th className="px-4 py-3 text-right">Balance</th>
                                                                                                                                                                          </tr>
                                                                                                                                                                                    </thead>
                                                                                                                                                                                              <tbody className="divide-y divide-border">
                                                                                                                                                                                                          {data.wallets.map((w) => (
                                                                                                                                                                                                                        <tr key={w.user_id}>
                                                                                                                                                                                                                                        <td className="px-4 py-3">{data.names.get(w.user_id) || w.user_id.slice(0, 8)}</td>
                                                                                                                                                                                                                                                        <td className="px-4 py-3 text-right font-mono font-medium">{formatNaira(w.balance_kobo)}</td>
                                                                                                                                                                                                                                                                      </tr>
                                                                                                                                                                                                                                                                                  ))}
                                                                                                                                                                                                                                                                                            </tbody>
                                                                                                                                                                                                                                                                                                    </table>
                                                                                                                                                                                                                                                                                                          </section>
                                                                                         <section className="overflow-x-auto rounded-2xl bg-card shadow-soft">
                                                                                                    <h2 className="px-4 pt-4 font-display font-semibold">Recent ledger entries</h2>
                                                                                                            <table className="w-full text-left text-xs">
                                                                                                                      <thead className="border-b uppercase text-muted-foreground">
                                                                                                                                  <tr>
                                                                                                                                                <th className="px-3 py-2">Customer</th>
                                                                                                                                                              <th className="px-3 py-2">Category</th>
                                                                                                                                                                            <th className="px-3 py-2 text-right">Amount</th>
                                                                                                                                                                                          <th className="px-3 py-2 text-right">After</th>
                                                                                                                                                                                                        <th className="px-3 py-2">Reference</th>
                                                                                                                                                                                                                      <th className="px-3 py-2">Date</th>
                                                                                                                                                                                                                                  </tr>
                                                                                                                                                                                                                                            </thead>
                                                                                          <tbody className="divide-y divide-border font-mono">
                                                                                                        {data.txns.map((t) => (
                                                                                                                      <tr key={t.id}>
                                                                                                                                      <td className="px-3 py-2 font-sans">{data.names.get(t.user_id) || t.user_id.slice(0, 8)}</td>
                                                                                                                                                      <td className="px-3 py-2 font-sans">{CATEGORY_LABELS[t.category as keyof typeof CATEGORY_LABELS] || t.category}</td>
                                                                                                                                                                      <td className={`px-3 py-2 text-right font-semibold ${t.amount_kobo >= 0 ? "text-primary" : "text-destructive"}`}>
                                                                                                                                                                                        {t.amount_kobo >= 0 ? "+" : ""}{formatNaira(t.amount_kobo)}
                                                                                                                                                                                                        </td>
                                                                                                                                                                                                                        <td className="px-3 py-2 text-right">{formatNaira(t.balance_after_kobo)}</td>
                                                                                                                                                                                                                                        <td className="px-3 py-2 text-[10px] text-muted-foreground">{t.reference}</td>
                                                                                                                                                                                                                                                        <td className="px-3 py-2 text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString("en-NG")}</td>
                                                                                                                                                                                                                                                                      </tr>
                                                                                                                                                                                                                                                                                  ))}
                                                                                                                                                                                                                                                                                            </tbody>
                                                                                                                                                                                                                                                                                                    </table>
                                                                                                                                                                                                                                                                                                          </section>
                                                                                                                                                                                                                                                                                                              </div>
                                                                                                                                                                                                                                                                                                                );
                                                                                                                                                                                                                                                                                                                }

                                                                                        export function WelcomeBonusSettings() {
                                                                                              const qc = useQueryClient();
                                                                                                const { data, isLoading } = useQuery(bonusSettingsQuery);
                                                                                                  const [enabled, setEnabled] = useState(true);
                                                                                                    const [amount, setAmount] = useState("100");
                                                                                                      const [saving, setSaving] = useState(false);

                                                                                                        useEffect(() => {
                                                                                                            if (data) {
                                                                                                                  setEnabled(data.is_active);
                                                                                                                        setAmount((data.bonus_amount_kobo / 100).toString());
                                                                                                                            }
                                                                                                                              }, [data]);
                                                                                       if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
                                                                                         if (!data) return <FormMessage>Welcome bonus settings not configured in database.</FormMessage>;

                                                                                           async function save() {
                                                                                               setSaving(true);
                                                                                                   const kobo = nairaToKobo(amount);
                                                                                                       const { error } = await supabase
                                                                                                             .from("welcome_bonus_settings")
                                                                                                                   .update({ is_active: enabled, bonus_amount_kobo: kobo, updated_at: new Date().toISOString() })
                                                                                                                         .eq("id", data.id);
                                                                                                                             setSaving(false);
                                                                                                                                 if (error) {
                                                                                                                                       toast.error(error.message);
                                                                                                                                             return;
                                                                                                                                                 }
                                                                                                                                                     toast.success("Welcome bonus updated");
                                                                                                                                                         await qc.invalidateQueries({ queryKey: bonusSettingsQuery.queryKey });
                                                                                                                                                           }
                                                                                       return (
                                                                                            <div className="space-y-4 rounded-2xl bg-card p-5 shadow-soft">
                                                                                                  <label className="flex items-center justify-between gap-4">
                                                                                                          <span>
                                                                                                                    <span className="font-medium">Welcome bonus active</span>
                                                                                                                              <span className="block text-xs text-muted-foreground">
                                                                                                                                          Turning it off only stops new bonuses; bonuses already credited stay.
                                                                                                                                                    </span>
                                                                                                                                                            </span>
                                                                                                                                                                    <input
                                                                                                                                                                              type="checkbox"
                                                                                                                                                                                        className="size-5 accent-[var(--color-primary)]"
                                                                                                                                                                                                  checked={enabled}
                                                                                                                                                                                                            onChange={(e) => setEnabled(e.target.checked)}
                                                                                                                                                                                                                    />
                                                                                                                                                                                                                          </label>
                                                                                        <label className="block">
                                                                                                    <span className="text-sm font-medium">Bonus amount (₦)</span>
                                                                                                            <input
                                                                                                                      inputMode="decimal"
                                                                                                                                value={amount}
                                                                                                                                          onChange={(e) => setAmount(e.target.value)}
                                                                                                                                                    className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5"
                                                                                                                                                            />
                                                                                                                                                                  </label>

                                                                                                                                                                        <p className="text-xs text-muted-foreground">
                                                                                                                                                                                Credited exactly once per customer after successful email verification. SMS verification is not required.
                                                                                                                                                                                      </p>
                                                                                        <button
                                                                                                onClick={save}
                                                                                                        disabled={saving}
                                                                                                                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                                                                                                                      >
                                                                                                                              {saving ? "Saving…" : "Save settings"}
                                                                                                                                    </button>

                                                                                                                                          <p className="text-[11px] text-muted-foreground">
                                                                                                                                                  Last changed {new Date(data.updated_at).toLocaleString("en-NG")}
                                                                                                                                                        </p>
                                                                                                                                                            </div>
                                                                                                                                                              );
                                                                                                                                                              }