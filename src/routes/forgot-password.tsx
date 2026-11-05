import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field, FormMessage, SubmitButton } from "@/components/auth/AuthLayout";
import { fieldErrors, newPasswordSchema, type FormErrors } from "@/lib/auth-schemas";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Smart Browsers" },
      { name: "description", content: "Reset your Smart Browsers password with a code sent to your email." },
      { property: "og:title", content: "Reset Password — Smart Browsers" },
      { property: "og:description", content: "Reset your Smart Browsers password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPage,
});

const codeSchema = z.string().trim().regex(/^\d{6,8}$/, "Enter the code from your email");

function ForgotPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<FormErrors & { code?: string }>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setServerError("");
    const ok = z.string().trim().email().safeParse(email);
    if (!ok.success) return setErrors({ email: "Enter a valid email" });
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(ok.data.toLowerCase(), { redirectTo: `${window.location.origin}/reset-password` });
    setLoading(false);
    // Same response whether or not the email is registered; only rate limits are surfaced.
    if (error && /rate|too many|seconds/i.test(error.message)) return setServerError("Too many requests. Please wait a minute and try again.");
    setStep("code");
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    const c = codeSchema.safeParse(code);
    const p = newPasswordSchema.safeParse(pw);
    const errs: FormErrors & { code?: string } = p.success ? {} : fieldErrors(p.error);
    if (!c.success) errs.code = "Enter the code from your email";
    if (!c.success || !p.success) return setErrors(errs);
    setErrors({});
    setLoading(true);
    const { error: vErr } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: c.data, type: "recovery" });
    if (vErr) {
      setLoading(false);
      return setServerError("That code is incorrect or has expired. Request a new one.");
    }
    const { error } = await supabase.auth.updateUser({ password: p.data.password });
    if (error) {
      setLoading(false);
      return setServerError(/same|different/i.test(error.message) ? "Choose a password different from your old one." : error.message);
    }
    // End every other session so the old password and devices are fully logged out.
    await supabase.auth.signOut({ scope: "others" });
    setLoading(false);
    navigate({ to: "/app/$section", params: { section: "dashboard" }, replace: true });
  }

  return (
    <AuthLayout title="Forgot password" subtitle={step === "email" ? "We'll email you a one-time reset code." : "Enter the code and choose a new password."}
      footer={<Link to="/login" className="font-semibold text-primary">Back to Login</Link>}>
      {step === "email" ? (
        <form className="space-y-4" onSubmit={sendCode} noValidate>
          <Field label="Registered email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
          {serverError && <FormMessage>{serverError}</FormMessage>}
          <SubmitButton loading={loading}>Send reset code</SubmitButton>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={resetPassword} noValidate>
          <FormMessage tone="success">If an account exists for {email}, we've sent a reset code. It expires shortly and works once. Check your spam folder too.</FormMessage>
          <Field label="Reset code" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} />
          <Field label="New password" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} error={errors.password} />
          <Field label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} error={errors.confirmPassword} />
          {serverError && <FormMessage>{serverError}</FormMessage>}
          <SubmitButton loading={loading}>Reset password</SubmitButton>
          <button type="button" disabled={loading} onClick={() => sendCode()} className="w-full text-sm font-medium text-primary">Send a new code</button>
        </form>
      )}
    </AuthLayout>
  );
}
