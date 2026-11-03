import type { ReactNode } from "react";
import type { NavItem } from "@/config/navigation";
import { Construction } from "lucide-react";

export function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-gold bg-gold/10 p-4 text-sm">
      <Construction className="mt-0.5 size-4 shrink-0" />
      <p>
        {children ??
          "Layout preview only. No real accounts, payments, wallet funding or VTU services are connected yet — nothing on this page is live data."}
      </p>
    </div>
  );
}

export function EmptyPanel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <div className="mt-4 grid place-items-center rounded-xl bg-muted py-10 text-center text-sm text-muted-foreground">
        {hint}
      </div>
    </div>
  );
}

export function PageScaffold({ item, children, live = false }: { item: NavItem; children?: ReactNode; live?: boolean }) {
  const Icon = item.icon;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 animate-rise">
      <header className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <Icon className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold leading-tight">{item.label}</h1>
          <p className="text-sm text-muted-foreground">{item.description}</p>
        </div>
      </header>
      {!live && <DemoNotice>This section isn't live yet. No payments, wallet funding or VTU services are connected — nothing here is real data.</DemoNotice>}
      {children ?? (
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyPanel title="Overview" hint="This section will show real data once the backend is connected." />
          <EmptyPanel title="Recent activity" hint="No activity yet." />
        </div>
      )}
    </div>
  );
}
