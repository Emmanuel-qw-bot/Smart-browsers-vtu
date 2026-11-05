import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, Field, FormMessage, SubmitButton } from "@/components/auth/AuthLayout";
import { REGISTRATION_SOURCES, fieldErrors, normalizeNigerianPhone, signupSchema , type FormErrors } from "@/lib/auth-schemas";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — Smart Browsers" },
      { name: "description", content: "Create your Smart Browsers account for data, airtime and rewards." },
      { property: "og:title", content: "Create Account — Smart Browsers" },
      { property: "og:description", content: "Join Smart Browsers and get ₦100 free." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", password: "", confirmPassword: "",
    source: "", sourceOther: "", inviteCode: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setServerError("");
    const parsed = signupSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    const d = parsed.data;
    const code = d.inviteCode ?? "";
    setLoading(true);
    try {
      const phone = normalizeNigerianPhone(d.phone)!;
      const { data: taken, error: cErr } = await supabase.rpc("registration_conflicts", { _email: d.email, _phone: phone });
      if (cErr) throw cErr;
      const t = (taken ?? {}) as { email?: boolean; phone?: boolean };
      if (t.email || t.phone) {
        setErrors({
          email: t.email ? "This email is already registered. Try logging in instead." : undefined,
          phone: t.phone ? "This phone number is already registered to another account." : undefined,
        });
        return;
      }
      if (code) {
        const { data: ok, error } = await supabase.rpc("invite_code_is_valid", { _code: code });
        if (error) throw error;
        if (!ok) { setErrors({ inviteCode: "We couldn't find that invitation code" }); return; }
      }
      const { error } = await supabase.auth.signUp({
        email: d.email,
        password: d.password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/dashboard`,
          data: {
            full_name: d.fullName,
            phone,
            registration_source: d.source,
            registration_source_other: d.source === "other" ? d.sourceOther : "",
            referral_code: code,
          },
        },
      });
      if (error) throw error;
      setSentTo(d.email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setServerError(/already registered/i.test(msg)
        ? "This email is already registered. Try logging in instead."
        : /database error/i.test(msg)
          ? "We couldn't create your account. Your email or phone number may already be registered — please check and try again."
          : msg);
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" subtitle="One last step to activate your account."
        footer={<Link to="/login" className="font-semibold text-primary">Go to Login</Link>}>
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-secondary p-6 text-center text-sm text-secondary-foreground">
          <MailCheck className="size-10" />
          <p>We sent a confirmation link to <strong>{sentTo}</strong>. Open it to verify your email — that activates your account and adds your welcome bonus if the offer is running. Then log in.</p>
          <p className="text-xs opacity-75">Can't find it? Check your spam folder.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create Account" subtitle="Join Smart Browsers in under a minute."
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary">Login</Link></>}>
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Full name" autoComplete="name" placeholder="e.g. Ada Okafor" value={form.fullName} onChange={set("fullName")} error={errors.fullName} />
        <Field label="Email address" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set("email")} error={errors.email} />
        <Field label="Phone number" type="tel" autoComplete="tel" inputMode="tel" placeholder="08012345678" value={form.phone} onChange={set("phone")} error={errors.phone} />
        <Field label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} />
        <Field label="Confirm password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set("confirmPassword")} error={errors.confirmPassword} />

        <label className="block text-sm font-medium">
          How did you hear about Smart Browsers?
          <select value={form.source} onChange={set("source")} aria-invalid={!!errors.source}
            className="mt-1.5 w-full rounded-xl border bg-muted px-4 py-3 text-base outline-none focus:border-primary aria-[invalid=true]:border-destructive">
            <option value="" disabled>Select an option</option>
            {REGISTRATION_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          {errors.source && <span className="mt-1 block text-xs text-destructive">{errors.source}</span>}
        </label>

        {form.source === "other" && (
          <Field label="Please tell us where" maxLength={100} value={form.sourceOther} onChange={set("sourceOther")} error={errors.sourceOther} />
        )}

        <Field
          label={form.source === "friends" ? "Your friend's invitation code" : "Referral / invitation code (optional)"}
          placeholder="SB-8KX92P" autoCapitalize="characters" value={form.inviteCode} onChange={set("inviteCode")} error={errors.inviteCode}
        />

        {serverError && <FormMessage>{serverError}</FormMessage>}
        <SubmitButton loading={loading}>Create Account</SubmitButton>
        <p className="text-center text-[11px] text-muted-foreground">Welcome bonus terms will be announced when wallets go live.</p>
      </form>
    </AuthLayout>
  );
}
