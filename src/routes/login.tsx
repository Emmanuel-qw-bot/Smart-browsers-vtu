import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout, Field } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Smart Browsers" },
      { name: "description", content: "Log in to your Smart Browsers account." },
      { property: "og:title", content: "Login — Smart Browsers" },
      { property: "og:description", content: "Access your Smart Browsers wallet, data and airtime." },
    ],
  }),
  component: () => (
    <AuthLayout title="Login" subtitle="Welcome back to Smart Browsers."
      footer={<>New here? <Link to="/signup" className="font-semibold text-primary">Create Account</Link></>}>
      <Field label="Email or phone" placeholder="you@example.com" />
      <Field label="Password" type="password" />
    </AuthLayout>
  ),
});
