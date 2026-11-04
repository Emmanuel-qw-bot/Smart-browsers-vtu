import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const CATEGORY_LABELS = {
  deposit: "Cash deposit",
  promotional: "Promotional credit",
  reward: "Reward",
  purchase: "Purchase",
  refund: "Refund",
} as const;

export function formatNaira(kobo: number): string {
  const sign = kobo < 0 ? "-" : "";
  return `${sign}₦${(Math.abs(kobo) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Converts a naira amount typed by an admin into kobo; null when invalid. */
export function nairaToKobo(input: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(input.trim())) return null;
  const kobo = Math.round(Number(input) * 100);
  return kobo > 0 && kobo <= 10_000_000 ? kobo : null;
}

export const myWalletQuery = queryOptions({
  queryKey: ["wallet", "me"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const { data, error } = await supabase.from("wallets").select("balance_kobo").eq("user_id", u.user.id).maybeSingle();
    if (error) throw error;
    return data?.balance_kobo ?? 0;
  },
});

export const myTransactionsQuery = (limit: number) =>
  queryOptions({
    queryKey: ["wallet", "me", "transactions", limit],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("id, category, amount_kobo, balance_after_kobo, reference, description, created_at")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });

export const bonusSettingsQuery = queryOptions({
  queryKey: ["welcome-bonus-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("welcome_bonus_settings").select("enabled, amount_kobo, updated_at").maybeSingle();
    if (error) throw error;
    return data;
  },
});
