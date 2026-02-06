import * as React from "react"
import { Loader2Icon, ShieldAlertIcon, ShieldCheckIcon, ShieldIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSIWE, type SIWEStatus } from "@/hooks/useSIWE"

export interface SIWEButtonProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  className?: string
}

function getStatusText(status: SIWEStatus): string {
  switch (status) {
    case "idle":
      return "Verify Wallet"
    case "generating_nonce":
      return "Preparing…"
    case "awaiting_signature":
      return "Sign in Wallet"
    case "verifying":
      return "Verifying…"
    case "success":
      return "Verified!"
    case "error":
      return "Try Again"
    default:
      return "Verify Wallet"
  }
}

function getStatusIcon(status: SIWEStatus) {
  switch (status) {
    case "generating_nonce":
    case "awaiting_signature":
    case "verifying":
      return <Loader2Icon className="size-4 animate-spin" />
    case "success":
      return <ShieldCheckIcon className="size-4" />
    case "error":
      return <ShieldAlertIcon className="size-4" />
    default:
      return <ShieldIcon className="size-4" />
  }
}

function getStatusVariant(status: SIWEStatus): "default" | "success" | "destructive" {
  switch (status) {
    case "success":
      return "success"
    case "error":
      return "destructive"
    default:
      return "default"
  }
}

export function SIWEButton({ onSuccess, onError, className }: SIWEButtonProps) {
  const { status, error, verify, reset, isVerifying, isSuccess, isError } = useSIWE()

  React.useEffect(() => {
    if (isSuccess && onSuccess) onSuccess()
  }, [isSuccess, onSuccess])

  React.useEffect(() => {
    if (isError && error && onError) onError(error)
  }, [isError, error, onError])

  const handleClick = () => {
    if (isError) {
      reset()
      setTimeout(() => verify(), 100)
      return
    }

    if (!isVerifying && !isSuccess) verify()
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={getStatusVariant(status)}
        onClick={handleClick}
        disabled={isVerifying || isSuccess}
        className={className}
      >
        {getStatusIcon(status)}
        <span className="ml-2">{getStatusText(status)}</span>
      </Button>

      {isError && error && <p className="text-sm text-destructive">{error}</p>}
      {isSuccess && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Wallet successfully linked to your account!
        </p>
      )}
    </div>
  )
}

