import { cn } from "@/lib/utils";

export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("py-6 text-center text-xs text-muted-foreground", className)}>
      © 2026 Smart Browsers. All rights reserved.
    </footer>
  );
}
