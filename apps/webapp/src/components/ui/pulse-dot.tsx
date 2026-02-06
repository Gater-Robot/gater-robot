import { cn } from "@/lib/utils";

interface PulseDotProps {
  color?: string;
  size?: number;
  className?: string;
}

export function PulseDot({ color, size = 8, className }: PulseDotProps) {
  return (
    <span
      className={cn("inline-block rounded-full pulse-dot", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color || "var(--color-primary)",
      }}
    />
  );
}
