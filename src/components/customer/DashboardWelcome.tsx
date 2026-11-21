import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardWelcome() {
  const [username, setUsername] = useState("there");
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const user = data.user;
      const metadata = user?.user_metadata ?? {};
      const name = metadata.username ?? metadata.full_name ?? metadata.name ?? metadata.first_name;
      const fallback = user?.email?.split("@")[0];
      setUsername(typeof name === "string" && name.trim() ? name.trim().split(" ")[0] : fallback || "there");
    });
    const refreshGreeting = () => setGreeting(getGreeting());
    const interval = window.setInterval(refreshGreeting, 60_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <header className="flex items-center gap-3">
      <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        <LayoutDashboard className="size-5" />
      </span>
      <div>
        <h1 className="font-display text-2xl font-semibold leading-tight">Dear {username} 👋</h1>
        <p className="text-sm text-muted-foreground">{greeting}.</p>
      </div>
    </header>
  );
}
