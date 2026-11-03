import { useState, type ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Menu, ShieldAlert, X } from "lucide-react";
import { adminNav } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/shared/Footer";

export function AdminShell({ children }: { children: ReactNode }) {
  const { section } = useParams({ strict: false }) as { section?: string };
  const [open, setOpen] = useState(false);

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-sidebar p-4 text-sidebar-foreground">
      <div className="mb-6 px-2">
        <p className="font-display text-lg font-semibold text-sidebar-accent-foreground">Smart Browsers</p>
        <p className="text-[10px] font-semibold tracking-[0.3em] text-sidebar-primary">ADMIN CONTROL CENTRE</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto">
        {adminNav.map((n) => (
          <Link key={n.slug} to="/admin/$section" params={{ section: n.slug }} onClick={() => setOpen(false)}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent",
              section === n.slug && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary")}>
            <n.icon className="size-4 shrink-0" /> <span className="truncate">{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted font-sans">
      <aside className="fixed inset-y-0 left-0 hidden w-72 lg:block"><Sidebar /></aside>
      {open && (
        <div className="fixed inset-0 z-40 bg-charcoal/50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-72" onClick={(e) => e.stopPropagation()}><Sidebar /></div>
        </div>
      )}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-card px-4 py-3 lg:ml-72">
        <button className="grid size-10 place-items-center rounded-lg bg-muted lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <span className="font-semibold">Admin</span>
      </header>
      <div className="lg:ml-72">
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl bg-charcoal p-3 text-xs text-charcoal-foreground lg:mx-8">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" />
          Admin Control Centre — restricted to accounts with the admin role. Most sections are layouts awaiting backend features; only Customers shows live data.
        </div>
        <main className="px-4 py-5 lg:px-8">{children}<Footer className="mt-6" /></main>
      </div>
    </div>
  );
}
