import { cn } from "@/lib/utils";

interface PulseDotProps {
  color?: string;
  size?: number;
  className?: string;
}

export function PulseDot({ color, size = 8, className }: PulseDotProps) {
  return (
    <span
      className={cn("inline-block rounded-full", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: color || "var(--color-primary)",
        animation: "pulse-dot 2s ease-in-out infinite",
      }}
    />
  );
}
