import { cn } from "@/lib/utils";

interface StatPillProps {
  label: string;
  value: string | number;
  color?: string;
  className?: string;
}

export function StatPill({ label, value, color, className }: StatPillProps) {
  const pillColor = color || "var(--color-primary)";
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-4 py-3",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${pillColor} 10%, transparent)`,
        borderColor: `color-mix(in srgb, ${pillColor} 20%, transparent)`,
      }}
    >
      <span
        className="font-mono text-xl font-semibold"
        style={{ color: pillColor }}
      >
        {value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
