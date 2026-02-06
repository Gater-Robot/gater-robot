import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionHeaderProps {
  children: ReactNode;
  count?: number;
  className?: string;
}

export function SectionHeader({ children, count, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {children}
      </span>
      {count !== undefined && (
        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
          {count}
        </span>
      )}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
