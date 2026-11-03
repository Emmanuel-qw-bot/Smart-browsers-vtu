import { cn } from "@/lib/utils";

/** Wordmark. `animated` draws it like handwriting (used on the splash screen). */
export function Logo({ animated = false, className }: { animated?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 520 120" className={cn("h-auto w-full", className)} role="img" aria-label="Smart Browsers">
      <text
        x="50%"
        y="82"
        textAnchor="middle"
        className={cn("font-script", animated && "handwrite")}
        fontSize="84"
        fontWeight={700}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={animated ? 1.6 : 0}
      >
        Smart Browsers
      </text>
    </svg>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand font-script text-lg font-bold text-primary-foreground shadow-brand">
        S
      </span>
      <span className="leading-none">
        <span className="block font-display text-base font-semibold">Smart Browsers</span>
        <span className="block text-[10px] font-semibold tracking-[0.3em] text-muted-foreground">SBR 2026</span>
      </span>
    </span>
  );
}
