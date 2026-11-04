import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, Info } from "lucide-react";
import { CATEGORY_LABELS, formatNaira, myTransactionsQuery, myWalletQuery } from "@/lib/wallet";

export function BalanceCard({ showFund = true }: { showFund?: boolean }) {
  const { data, isLoading, error } = useQuery(myWalletQuery);
  return (
    <div className="rounded-3xl bg-brand p-6 text-primary-foreground shadow-brand">
      <p className="flex items-center gap-2 text-sm opacity-85"><Eye className="size-4" /> Wallet balance</p>
      <p className="mt-2 font-display text-4xl font-bold">{isLoading ? "…" : error ? "₦ —" : formatNaira(data ?? 0)}</p>
      <p className="mt-1 text-xs opacity-75">Spend on data and airtime. Wallet funds can't be withdrawn.</p>
      {showFund && (
        <Link to="/app/$section" params={{ section: "wallet" }} className="mt-5 inline-block rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-primary-deep">View wallet</Link>
      )}
    </div>
  );
}

export function TransactionList({ limit }: { limit: number }) {
  const { data, isLoading, error } = useQuery(myTransactionsQuery(limit));
  if (isLoading) return <div className="h-32 animate-pulse rounded-2xl bg-card" />;
  if (error) return <p className="rounded-2xl bg-card p-6 text-sm text-destructive">Couldn't load transactions.</p>;
  if (!data?.length) return <p className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">No wallet transactions yet.</p>;
  return (
    <ul className="divide-y rounded-2xl bg-card shadow-soft">
      {data.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{t.description}</p>
            <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[t.category]} · {new Date(t.created_at).toLocaleString("en-NG")}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-semibold ${t.amount_kobo < 0 ? "text-destructive" : "text-primary"}`}>{t.amount_kobo > 0 ? "+" : ""}{formatNaira(t.amount_kobo)}</p>
            <p className="text-[11px] text-muted-foreground">Bal {formatNaira(t.balance_after_kobo)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function WalletPanel() {
  return (
    <div className="space-y-5">
      <BalanceCard showFund={false} />
      <div className="flex gap-3 rounded-2xl border border-dashed border-gold/60 bg-card p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-gold" />
        <p><strong>Wallet funding isn't live yet.</strong> Card and bank deposits will open once a payment gateway is connected in a later stage. No payments can be made right now.</p>
      </div>
      <h2 className="font-display text-lg font-semibold">Transaction history</h2>
      <TransactionList limit={100} />
    </div>
  );
}
