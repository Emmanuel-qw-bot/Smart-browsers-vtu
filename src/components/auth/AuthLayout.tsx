import type { ReactNode, InputHTMLAttributes } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { Footer } from "@/components/shared/Footer";
import { cn } from "@/lib/utils";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="h-40 rounded-b-[2.5rem] bg-brand" />
      <div className="mx-auto -mt-28 w-full max-w-md px-5">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-primary-foreground"><ArrowLeft className="size-4" /> Back</Link>
        <div className="rounded-3xl bg-card p-6 shadow-soft animate-rise">
          <LogoMark />
          <h1 className="mt-6 font-display text-2xl font-semibold">{title}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>
          {children}
          {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
      <Footer />
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function Field({ label, error, className, ...props }: FieldProps) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        {...props}
        aria-invalid={!!error}
        className={cn(
          "mt-1.5 w-full rounded-xl border bg-muted px-4 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 aria-[invalid=true]:border-destructive",
          className,
        )}
      />
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function SubmitButton({ loading, children }: { loading?: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-brand transition active:scale-[.98] disabled:opacity-60">
      {loading ? "Please wait…" : children}
    </button>
  );
}

export function FormMessage({ tone = "error", children }: { tone?: "error" | "success"; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl p-3 text-sm", tone === "error" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground")}>
      {children}
    </div>
  );
}
