import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CustomerShell } from "@/components/customer/CustomerShell";

export const Route = createFileRoute("/app")({
  component: () => (
    <CustomerShell>
      <Outlet />
    </CustomerShell>
  ),
});
