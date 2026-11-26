import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormMessage } from "@/components/auth/AuthLayout";

/** Real customer list. Database policies only return rows to admins. */
export function CustomersTable() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const since = new Date(Date.now()-24*60*60*1000).toISOString();
      const [list,total,newToday] = await Promise.all([
        supabase.from("profiles").select("id, full_name, username, email, phone, invite_code, registration_source, email_verified, phone_verified, created_at").order("created_at",{ascending:false}).limit(200),
        supabase.from("profiles").select("id",{count:"exact",head:true}),
        supabase.from("profiles").select("id",{count:"exact",head:true}).gte("created_at",since),
      ]);
      if (list.error) throw list.error;
      if (total.error) throw total.error;
      if (newToday.error) throw newToday.error;
      return {data:list.data??[],total:total.count??0,newToday:newToday.count??0};
    },
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  if (error) return <FormMessage>Couldn't load customers.</FormMessage>;
  if (!data?.data.length) return <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">No customers have registered yet.</div>;
  const customers=data.data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Total registered</p><p className="mt-1 text-2xl font-bold">{data.total.toLocaleString()}</p></div><div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Joined in last 24 hours</p><p className="mt-1 text-2xl font-bold">{data.newToday.toLocaleString()}</p></div><div className="rounded-2xl border bg-card p-4"><p className="text-xs text-muted-foreground">Latest shown</p><p className="mt-1 text-2xl font-bold">{customers.length}</p></div></div>
    <div className="overflow-x-auto rounded-2xl bg-card shadow-soft">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr>{["Full name", "Username", "Email", "Phone", "Referral code", "Source", "Email verified", "Phone verified", "Joined"].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-3 font-medium">{c.full_name}</td>
              <td className="px-4 py-3">@{c.username}</td>
              <td className="px-4 py-3">{c.email}</td>
              <td className="px-4 py-3">{c.phone}</td>
              <td className="px-4 py-3 font-mono text-xs">{c.invite_code}</td>
              <td className="px-4 py-3 capitalize">{c.registration_source.replace("_", " ")}</td>
              <td className="px-4 py-3">{c.email_verified ? "✓" : "—"}</td>
              <td className="px-4 py-3">{c.phone_verified ? "✓" : "—"}</td>
              <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString("en-NG")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
