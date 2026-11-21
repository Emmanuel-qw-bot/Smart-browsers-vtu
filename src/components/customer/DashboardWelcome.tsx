import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardWelcome() {
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    const refreshGreeting = () => setGreeting(getGreeting());
    const interval = window.setInterval(refreshGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground font-semibold">
        E
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{greeting} ☺️👋</p>
        <h1 className="font-display text-xl font-bold uppercase tracking-wide leading-tight">EMMANUEL</h1>
      </div>
    </header>
  );
}
