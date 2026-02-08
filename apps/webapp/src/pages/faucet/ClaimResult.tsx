import { CheckCircle2Icon, PlusIcon, XCircleIcon } from "lucide-react"

import { StatPill } from "@/components/ui/stat-pill"
import { FAUCET_AMOUNT } from "./constants"

export function ClaimSuccess({
  formattedBalance,
  addedToWallet,
  onAddToWallet,
}: {
  formattedBalance: string
  addedToWallet: boolean
  onAddToWallet: () => void
}) {
  return (
    <div className="space-y-4 py-6 text-center fade-up">
      <div className="inline-flex size-16 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2Icon className="size-8 text-success" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-success">
          Tokens Claimed!
        </h3>
        <p className="text-muted-foreground">
          You received {FAUCET_AMOUNT} $BEST tokens.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 fade-up stagger-3">
        <StatPill label="Balance" value={`${formattedBalance} $BEST`} color="text-primary" />
        <StatPill label="Status" value="Claimed" color="text-success" />
      </div>

      {!addedToWallet ? (
        <button
          type="button"
          onClick={onAddToWallet}
          className="rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-mono hover:bg-primary/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="inline-flex items-center gap-1.5">
            <PlusIcon className="size-3.5" />
            Add $BEST to Wallet
          </span>
        </button>
      ) : (
        <p className="flex items-center justify-center gap-1 text-sm text-success">
          <CheckCircle2Icon className="size-4" />
          Token added to wallet
        </p>
      )}
    </div>
  )
}

export function ClaimError({
  errorMessage,
  onReset,
}: {
  errorMessage: string
  onReset: () => void
}) {
  return (
    <div className="space-y-4 py-6 text-center fade-up">
      <div className="inline-flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <XCircleIcon className="size-8 text-destructive" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-destructive">
          Claim Failed
        </h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          {errorMessage || "Something went wrong. Please try again."}
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-mono hover:bg-primary/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Try Again
      </button>
    </div>
  )
}
