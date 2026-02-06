import { cn } from "@/lib/utils";

interface PulseDotProps {
  /** Tailwind background color class, e.g. "bg-primary", "bg-success", "bg-destructive" */
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PulseDot({ color = "bg-primary", size = "md", className }: PulseDotProps) {
  const sizes = {
    sm: { outer: "size-3", inner: "size-1.5" },
    md: { outer: "size-4", inner: "size-2" },
    lg: { outer: "size-5", inner: "size-2.5" },
  };
  const s = sizes[size];
  return (
    <span className={cn("relative inline-flex items-center justify-center", s.outer, className)}>
      <span className={cn("absolute rounded-full animate-ping opacity-30", s.outer, color)} />
      <span className={cn("relative rounded-full", s.inner, color)} />
    </span>
  );
}
