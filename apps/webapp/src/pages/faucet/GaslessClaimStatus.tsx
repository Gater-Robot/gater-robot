import { XCircleIcon } from "lucide-react"

import { TransactionStatus } from "@/components/web3/TransactionStatus"
import type { GaslessStatus } from "./constants"

export function GaslessClaimStatus({
  status,
  txHash,
  chainId,
  errorMessage,
  onRetry,
}: {
  status: GaslessStatus
  txHash?: string
  chainId: number
  errorMessage?: string
  onRetry: () => void
}) {
  if (status === "idle") return null

  if (status === "confirmed") return null // handled by parent success state

  if (status === "failed") {
    return (
      <div className="space-y-3 py-4 text-center fade-up">
        <div className="inline-flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircleIcon className="size-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-destructive">Gasless Claim Failed</h3>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground mt-1">
            {errorMessage || "Something went wrong. You can try again or claim with gas."}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-mono hover:bg-primary/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Try Again
        </button>
      </div>
    )
  }

  // pending, submitting, submitted
  const titles: Record<string, string> = {
    pending: "Preparing gasless transaction...",
    submitting: "Sending sponsored transaction...",
    submitted: "Confirming on-chain...",
  }

  return (
    <div className="fade-up">
      <TransactionStatus
        state="pending"
        hash={txHash}
        chainId={chainId}
        title={titles[status] ?? "Processing..."}
        description="No gas needed — we're sponsoring this transaction for you."
      />
    </div>
  )
}
