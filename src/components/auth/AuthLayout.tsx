import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { DemoNotice } from "@/components/shared/PageScaffold";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="h-40 rounded-b-[2.5rem] bg-brand" />
      <div className="mx-auto -mt-28 w-full max-w-md px-5 pb-10">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-primary-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <div className="rounded-3xl bg-card p-6 shadow-soft animate-rise">
          <LogoMark />
          <h1 className="mt-6 font-display text-2xl font-semibold">{title}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>{children}
            <button type="submit" disabled className="w-full rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground opacity-60 shadow-brand">
              {title}
            </button>
          </form>
          <div className="mt-5"><DemoNotice>Sign-in isn't connected yet — this form is a design preview and won't create or open an account.</DemoNotice></div>
          <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
        <Link to="/app/$section" params={{ section: "dashboard" }} className="mt-4 block text-center text-xs text-muted-foreground underline">Preview dashboard layout</Link>
      </div>
    </div>
  );
}

export function Field({ label, type = "text", placeholder }: { label: string; type?: string; placeholder?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input type={type} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border bg-muted px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
    </label>
  );
}
