import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FormMessage } from "@/components/auth/AuthLayout";

/** Real customer list. Database policies only return rows to admins. */
export function CustomersTable() {
  const { data, error, isLoading } = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, invite_code, registration_source, email_verified, phone_verified, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-card" />;
  if (error) return <FormMessage>Couldn't load customers.</FormMessage>;
  if (!data?.length) return <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">No customers have registered yet.</div>;

  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-soft">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr>{["Name", "Email", "Phone", "Code", "Source", "Email", "Phone", "Joined"].map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="px-4 py-3 font-medium">{c.full_name}</td>
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
  );
}
