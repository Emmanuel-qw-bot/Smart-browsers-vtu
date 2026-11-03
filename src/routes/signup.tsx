import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout, Field } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — Smart Browsers" },
      { name: "description", content: "Create your Smart Browsers account for data, airtime and rewards." },
      { property: "og:title", content: "Create Account — Smart Browsers" },
      { property: "og:description", content: "Join Smart Browsers and get ₦100 free." },
    ],
  }),
  component: () => (
    <AuthLayout title="Create Account" subtitle="Join Smart Browsers in under a minute."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary">Login</Link></>}>
      <Field label="Full name" placeholder="e.g. Ada Okafor" />
      <Field label="Phone number" type="tel" placeholder="080..." />
      <Field label="Email" type="email" placeholder="you@example.com" />
      <Field label="Password" type="password" />
      <Field label="Referral code (optional)" />
    </AuthLayout>
  ),
});
