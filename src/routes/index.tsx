import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Wifi, Zap } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Browsers — Data, Airtime & More | SBR 2026" },
      { name: "description", content: "Buy data and airtime, convert airtime to cash and earn rewards with Smart Browsers." },
      { property: "og:title", content: "Smart Browsers — SBR 2026" },
      { property: "og:description", content: "Create an account and get ₦100 free. Data, airtime and rewards in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const [splash, setSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 3600);
    return () => clearTimeout(t);
  }, []);

  if (splash) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-brand px-6 text-primary-foreground" onClick={() => setSplash(false)}>
        <div className="w-full max-w-md text-center">
          <Logo animated />
          <p className="mt-2 text-sm font-bold tracking-[0.5em] animate-rise" style={{ animationDelay: "2.2s" }}>SBR 2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-brand font-sans text-primary-foreground">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary-glow/40 blur-3xl" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-10 pt-14">
        <div className="animate-rise">
          <Logo className="max-w-[260px]" />
          <p className="text-xs font-bold tracking-[0.5em] opacity-80">SBR 2026</p>
        </div>

        <div className="mt-auto space-y-6">
          <div className="rounded-3xl bg-card p-6 text-card-foreground shadow-soft animate-rise" style={{ animationDelay: ".15s" }}>
            <span className="inline-block rounded-full bg-gold px-3 py-1 text-[11px] font-bold tracking-wider text-charcoal">WELCOME OFFER</span>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight">
              CREATE AN ACCOUNT AND GET <span className="text-primary">₦100 FREE!</span>
            </h1>
            <ul className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-medium text-muted-foreground">
              <li className="rounded-xl bg-muted p-3"><Wifi className="mx-auto mb-1 size-5 text-primary" />Cheap data</li>
              <li className="rounded-xl bg-muted p-3"><Zap className="mx-auto mb-1 size-5 text-primary" />Fast top-ups</li>
              <li className="rounded-xl bg-muted p-3"><ShieldCheck className="mx-auto mb-1 size-5 text-primary" />Secure</li>
            </ul>
          </div>
          <div className="grid gap-3 animate-rise" style={{ animationDelay: ".3s" }}>
            <Link to="/signup" className="rounded-2xl bg-card py-4 text-center font-semibold text-primary-deep shadow-soft transition active:scale-[.98]">Create Account</Link>
            <Link to="/login" className="rounded-2xl border border-primary-foreground/60 py-4 text-center font-semibold transition hover:bg-primary-foreground/10 active:scale-[.98]">Login</Link>
          </div>
          <p className="text-center text-[11px] opacity-70">Bonus terms will be confirmed when accounts go live.</p>
        </div>
      </div>
    </div>
  );
}
