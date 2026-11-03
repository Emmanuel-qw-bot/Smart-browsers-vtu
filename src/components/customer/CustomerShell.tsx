import { useState, type ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Bell, Menu, X } from "lucide-react";
import { customerNav, customerBottomNav } from "@/config/navigation";
import { LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

export function CustomerShell({ children }: { children: ReactNode }) {
  const { section } = useParams({ strict: false }) as { section?: string };
  const [open, setOpen] = useState(false);
  const bottom = customerNav.filter((n) => customerBottomNav.includes(n.slug));

  const NavList = ({ onPick }: { onPick?: () => void }) => (
    <nav className="space-y-1">
      {customerNav.map((n) => (
        <Link
          key={n.slug}
          to="/app/$section"
          params={{ section: n.slug }}
          onClick={onPick}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent",
            section === n.slug && "bg-primary text-primary-foreground hover:bg-primary",
          )}
        >
          <n.icon className="size-4" /> {n.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background font-sans">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card p-4 lg:flex">
        <Link to="/" className="mb-6 px-2"><LogoMark /></Link>
        <div className="flex-1 overflow-y-auto"><NavList /></div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/90 px-4 py-3 backdrop-blur lg:ml-64">
        <span className="lg:hidden"><LogoMark /></span>
        <span className="hidden text-sm text-muted-foreground lg:block">Welcome to Smart Browsers</span>
        <Link to="/app/$section" params={{ section: "notifications" }} aria-label="Notifications" className="grid size-10 place-items-center rounded-full bg-muted">
          <Bell className="size-5" />
        </Link>
      </header>

      <main className="px-4 pb-28 pt-5 lg:ml-64 lg:px-8 lg:pb-10">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {bottom.map((n) => (
          <Link key={n.slug} to="/app/$section" params={{ section: n.slug }}
            className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground", section === n.slug && "text-primary")}>
            <n.icon className="size-5" /> {n.label.replace("Buy ", "")}
          </Link>
        ))}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground">
          <Menu className="size-5" /> More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 bg-charcoal/50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-card p-5 animate-rise" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-semibold">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="grid size-9 place-items-center rounded-full bg-muted"><X className="size-4" /></button>
            </div>
            <NavList onPick={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
