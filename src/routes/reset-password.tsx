import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field, FormMessage, SubmitButton } from "@/components/auth/AuthLayout";
import { fieldErrors, newPasswordSchema } from "@/lib/auth-schemas";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — Smart Browsers" },
      { name: "description", content: "Choose a new password for your Smart Browsers account." },
      { property: "og:title", content: "Set New Password — Smart Browsers" },
      { property: "og:description", content: "Choose a new Smart Browsers password." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session || window.location.hash.includes("type=recovery")) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = newPasswordSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) return setServerError(error.message);
    navigate({ to: "/app/$section", params: { section: "dashboard" }, replace: true });
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      {!ready ? (
        <FormMessage>This page only works from the reset link in your email. Request a new link if it has expired.</FormMessage>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit} noValidate>
          <Field label="New password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} />
          <Field label="Confirm new password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} error={errors.confirmPassword} />
          {serverError && <FormMessage>{serverError}</FormMessage>}
          <SubmitButton loading={loading}>Save new password</SubmitButton>
        </form>
      )}
    </AuthLayout>
  );
}
