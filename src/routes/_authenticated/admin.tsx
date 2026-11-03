import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

// UI gate only. Real enforcement is in the database: admin-only data is protected
// by row-level policies using has_role(auth.uid(), 'admin').
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  beforeLoad: async ({ context }) => {
    const { data: isAdmin, error } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (error || !isAdmin) throw redirect({ to: "/app/$section", params: { section: "dashboard" }, replace: true });
  },
  component: () => (
    <AdminShell>
      <Outlet />
    </AdminShell>
  ),
});
