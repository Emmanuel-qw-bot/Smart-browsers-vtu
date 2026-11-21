import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Info, Building2, Banknote, LockKeyhole } from "lucide-react";
import { CATEGORY_LABELS, formatNaira, myTransactionsQuery, myWalletQuery } from "@/lib/wallet";

export function BalanceCard({ showFund = true }: { showFund?: boolean }) {
  const { data, isLoading, error } = useQuery(myWalletQuery);
  const [visible, setVisible] = useState(false);
  const balanceText = isLoading ? "…" : error ? "₦ —" : formatNaira(data ?? 0);
  return (
    <div className="rounded-3xl bg-brand p-6 text-primary-foreground shadow-brand">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm opacity-85">Wallet balance</p>
        <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide wallet balance" : "Show wallet balance"} aria-pressed={visible} className="rounded-lg p-2 hover:bg-white/10">
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
      <p className="mt-2 font-display text-4xl font-bold">{visible ? balanceText : "****"}</p>
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
    <div className="space-y-3">
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
      {limit <= 2 && <div className="text-right"><Link to="/app/$section" params={{ section: "transactions" }} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">See all transactions</Link></div>}
    </div>
  );
}

function WalletFundingPreview() {
  const [selectedBank, setSelectedBank] = useState<"palmpay" | "9psb">("palmpay");
  const bankOptions = [
    { id: "palmpay" as const, name: "PalmPay", subtitle: "Payment Point virtual account", icon: Banknote },
    { id: "9psb" as const, name: "9PSB", subtitle: "Payment Point virtual account", icon: Building2 },
  ];
  return (
    <section className="space-y-4 rounded-3xl border bg-card p-4 shadow-soft sm:p-5">
      <div>
        <h2 className="font-display text-lg font-semibold">Fund your wallet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose your preferred bank for the planned Payment Point integration.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {bankOptions.map((bank) => {
          const Icon = bank.icon;
          const selected = selectedBank === bank.id;
          return (
            <button key={bank.id} type="button" onClick={() => setSelectedBank(bank.id)} aria-pressed={selected} className={`rounded-2xl border p-4 text-left transition ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:bg-muted/40"}`}>
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-muted"><Icon className="size-5" /></span>
                <div>
                  <p className="font-semibold">{bank.name}</p>
                  <p className="text-xs text-muted-foreground">{bank.subtitle}</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">{selected ? "Selected for preview" : "Tap to select"}</p>
            </button>
          );
        })}
      </div>
      <div className="rounded-2xl border border-dashed p-4">
        <div className="flex items-start gap-3">
          <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Payment Point isn't connected yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Your selected option ({selectedBank === "palmpay" ? "PalmPay" : "9PSB"}) is only a preview. No account will be created and no payment can be initiated.</p>
          </div>
        </div>
      </div>
      <button type="button" disabled className="w-full rounded-xl bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground disabled:cursor-not-allowed">
        Funding unavailable — gateway not connected
      </button>
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0" />This preview does not accept payment details, create deposits, or change your wallet balance.</p>
    </section>
  );
}

export function WalletPanel() {
  return (
    <div className="space-y-5">
      <BalanceCard showFund={false} />
      <WalletFundingPreview />
      <h2 className="font-display text-lg font-semibold">Transaction history</h2>
      <TransactionList limit={100} />
    </div>
  );
}
