import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field, FormMessage, SubmitButton } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Smart Browsers" },
      { name: "description", content: "Get a link to reset your Smart Browsers password." },
      { property: "og:title", content: "Reset Password — Smart Browsers" },
      { property: "og:description", content: "Reset your Smart Browsers password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = z.string().trim().email().safeParse(email);
    if (!ok.success) return setError("Enter a valid email");
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(ok.data, { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <AuthLayout title="Forgot password" subtitle="We'll email you a secure reset link."
      footer={<Link to="/login" className="font-semibold text-primary">Back to Login</Link>}>
      {sent ? (
        <FormMessage tone="success">If an account exists for {email}, a reset link is on its way. Check your inbox and spam folder.</FormMessage>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Field label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
