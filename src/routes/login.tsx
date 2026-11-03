import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field, FormMessage, SubmitButton } from "@/components/auth/AuthLayout";
import { fieldErrors, loginSchema } from "@/lib/auth-schemas";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Smart Browsers" },
      { name: "description", content: "Log in to your Smart Browsers account." },
      { property: "og:title", content: "Login — Smart Browsers" },
      { property: "og:description", content: "Access your Smart Browsers wallet, data and airtime." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      setServerError(/confirm/i.test(error.message)
        ? "Please verify your email first — check your inbox for the confirmation link."
        : "Incorrect email or password.");
      return;
    }
    navigate({ to: "/app/$section", params: { section: "dashboard" }, replace: true });
  }

  return (
    <AuthLayout title="Login" subtitle="Welcome back to Smart Browsers."
      footer={<>New here? <Link to="/signup" className="font-semibold text-primary">Create Account</Link></>}>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} error={errors.email} />
        <Field label="Password" type="password" autoComplete="current-password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
        <div className="text-right text-sm">
          <Link to="/forgot-password" className="font-medium text-primary">Forgot password?</Link>
        </div>
        {serverError && <FormMessage>{serverError}</FormMessage>}
        <SubmitButton loading={loading}>Login</SubmitButton>
      </form>
    </AuthLayout>
  );
}
