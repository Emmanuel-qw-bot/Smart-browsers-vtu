import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field, FormMessage, SubmitButton } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Reset Password — Smart Browsers" },
    { name: "description", content: "Request a secure email link to reset your Smart Browsers password." },
    { property: "og:title", content: "Reset Password — Smart Browsers" },
    { property: "og:description", content: "Reset your Smart Browsers password with an email link." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function sendLink(event: FormEvent) {
    event.preventDefault();
    const parsed = z.string().trim().email().max(255).safeParse(email);
    if (!parsed.success) { setError("Enter a valid email address."); return; }
    setLoading(true); setError("");
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(parsed.data.toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (requestError && /rate|too many|seconds/i.test(requestError.message)) {
        setError("Too many requests. Please wait a minute and try again.");
      } else if (requestError && /network|fetch|timeout/i.test(requestError.message)) {
        setError("We couldn't send your request. Please try again.");
      } else { setSent(true); }
    } catch { setError("We couldn't send your request. Please try again."); }
    finally { setLoading(false); }
  }
  return <AuthLayout title="Forgot password" subtitle="We'll email you a secure password reset link."
    footer={<Link to="/login" className="font-semibold text-primary">Back to Login</Link>}>
    {sent ? <div className="space-y-4">
      <FormMessage tone="success">If an account exists for that email address, we've sent a password reset link. Open it to choose a new password. Check your spam folder too.</FormMessage>
      <Button variant="outline" className="w-full" onClick={() => setSent(false)}>Request another link</Button>
    </div> : <form className="space-y-4" onSubmit={sendLink} noValidate>
      <Field label="Email address" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      {error && <FormMessage>{error}</FormMessage>}
      <SubmitButton loading={loading}>Send reset link</SubmitButton>
    </form>}
  </AuthLayout>;
}