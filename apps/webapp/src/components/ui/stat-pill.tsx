import { cn } from "@/lib/utils";

interface StatPillProps {
  label: string;
  value: string | number;
  color?: string;
  className?: string;
}

export function StatPill({ label, value, color = "text-primary", className }: StatPillProps) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border border-border/50 bg-card px-4 py-3", className)}>
      <span className={cn("font-mono text-xl font-semibold", color)}>{value}</span>
      <span className="font-sans text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">{label}</span>
    </div>
  );
}
