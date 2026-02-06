import * as React from "react"
import { CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CopyButtonProps = {
  value: string
  label?: string
  className?: string
}

export function CopyButton({ value, label = "Copied", className }: CopyButtonProps) {
  const [isCopying, startTransition] = React.useTransition()
  const canCopy = value.length > 0

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn("transition-none", className)}
      disabled={isCopying || !canCopy}
      onClick={() => {
        startTransition(async () => {
          try {
            await navigator.clipboard.writeText(value)
            toast.success(label)
          } catch {
            toast.error("Copy failed")
          }
        })
      }}
    >
      <CopyIcon className="size-4" />
      <span className="sr-only">Copy</span>
    </Button>
  )
}
