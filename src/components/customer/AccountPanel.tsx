import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Copy, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Field, FormMessage, SubmitButton } from "@/components/auth/AuthLayout";
import { REGISTRATION_SOURCES, normalizeNigerianPhone, newPasswordSchema, fieldErrors , type FormErrors } from "@/lib/auth-schemas";

type Profile = Tables<"profiles">;

function Status({ ok, label, pending }: { ok: boolean; label: string; pending: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm">
      <span>{label}</span>
      {ok ? (
        <span className="flex items-center gap-1 font-semibold text-primary"><CheckCircle2 className="size-4" /> Verified</span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-4" /> {pending}</span>
      )}
    </div>
  );
}

export function AccountPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState("");
  const [edit, setEdit] = useState({ fullName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: "", password: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState<FormErrors>({});
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      if (error || !data) { setLoadError("We couldn't load your profile."); return; }
      setProfile(data);
      setEdit({ fullName: data.full_name, phone: data.phone.replace(/^\+234/, "0") });
    })();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const phone = normalizeNigerianPhone(edit.phone);
    const name = edit.fullName.trim();
    if (name.length < 2 || name.length > 100) { toast.error("Enter your full name"); return; }
    if (!phone) { toast.error("Enter a valid Nigerian phone number"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("profiles").update({ full_name: name, phone }).eq("id", profile.id).select().single();
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "That phone number is already registered to another account." : "Couldn't save your changes");
      return;
    }
    setProfile(data);
    toast.success("Profile updated");
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    const parsed = newPasswordSchema.safeParse(pw);
    if (!parsed.success) { setPwErrors(fieldErrors(parsed.error)); return; }
    if (!pw.current) { setPwErrors({ current: "Enter your current password" }); return; }
    setPwErrors({});
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password, current_password: pw.current } as never);
    setPwSaving(false);
    if (error) { toast.error(error.message); return; }
    setPw({ current: "", password: "", confirmPassword: "" });
    toast.success("Password changed");
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (loadError) return <FormMessage>{loadError}</FormMessage>;
  if (!profile) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;

  const source = REGISTRATION_SOURCES.find((s) => s.value === profile.registration_source)?.label;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-3xl bg-brand p-6 text-primary-foreground shadow-brand md:col-span-2">
        <p className="text-sm opacity-85">Your invitation code</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="font-display text-3xl font-bold tracking-wider">{profile.invite_code}</span>
          <button onClick={() => { navigator.clipboard.writeText(profile.invite_code); toast.success("Code copied"); }}
            className="grid size-9 place-items-center rounded-full bg-primary-foreground/15" aria-label="Copy invitation code">
            <Copy className="size-4" />
          </button>
        </div>
        <p className="mt-2 text-xs opacity-75">This code is permanently yours. Share it with friends when they sign up.</p>
      </section>

      <section className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Verification</h3>
        <Status ok={profile.email_verified} label="Email address" pending="Pending" />
        <Status ok={profile.phone_verified} label="Phone number" pending="Unverified" />
        <p className="text-xs text-muted-foreground">Your phone number is saved but unverified. Phone verification will be added in the future — your account is activated by email verification.</p>
        <dl className="space-y-1 pt-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Email</dt><dd>{profile.email}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Heard about us</dt><dd>{source}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Joined</dt><dd>{new Date(profile.created_at).toLocaleDateString("en-NG")}</dd></div>
        </dl>
      </section>

      <form onSubmit={saveProfile} className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Personal details</h3>
        <Field label="Full name" value={edit.fullName} onChange={(e) => setEdit({ ...edit, fullName: e.target.value })} />
        <Field label="Phone number" type="tel" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
        <SubmitButton loading={saving}>Save changes</SubmitButton>
      </form>

      <form onSubmit={changePassword} className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Change password</h3>
        <Field label="Current password" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwErrors.current} />
        <Field label="New password" type="password" autoComplete="new-password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} error={pwErrors.password} />
        <Field label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} error={pwErrors.confirmPassword} />
        <SubmitButton loading={pwSaving}>Update password</SubmitButton>
      </form>

      <section className="flex flex-col justify-between gap-3 rounded-2xl border bg-card p-5 shadow-soft">
        <h3 className="font-display text-lg font-semibold">Session</h3>
        <button onClick={signOut} className="flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 py-3 font-semibold text-destructive">
          <LogOut className="size-4" /> Sign out
        </button>
      </section>
    </div>
  );
}
