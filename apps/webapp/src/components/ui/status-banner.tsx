import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusBannerVariants = cva(
  "rounded-lg border px-3 py-2",
  {
    variants: {
      variant: {
        warning:
          "border-warning/20 bg-warning-dim text-warning-foreground",
        success:
          "border-success/20 bg-success-dim text-success-foreground",
        info:
          "border-primary/20 bg-primary-dim text-foreground",
        destructive:
          "border-destructive/20 bg-destructive-dim text-foreground",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
)

const iconContainerVariants = cva(
  "flex size-8 shrink-0 items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        warning: "bg-warning/15 text-warning",
        success: "bg-success/15 text-success",
        info: "bg-primary/15 text-primary",
        destructive: "bg-destructive/15 text-destructive",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
)

export interface StatusBannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBannerVariants> {
  icon?: React.ReactNode
  title: string
  description?: string
}

export function StatusBanner({
  className,
  variant,
  icon,
  title,
  description,
  ...props
}: StatusBannerProps) {
  return (
    <div className={cn(statusBannerVariants({ variant }), className)} {...props}>
      <div className="flex items-center gap-2">
        {icon && (
          <div className={iconContainerVariants({ variant })}>
            {icon}
          </div>
        )}
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {description && (
            <p className="text-xs opacity-75">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
