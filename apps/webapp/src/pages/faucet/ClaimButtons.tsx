import { DropletsIcon, WalletIcon } from "lucide-react"

import { FAUCET_AMOUNT } from "./constants"

export function ClaimButtons({
  onGaslessClaim,
  onManualClaim,
}: {
  onGaslessClaim: () => void
  onManualClaim: () => void
}) {
  return (
    <>
      <p className="text-muted-foreground">
        You are eligible to claim <strong>{FAUCET_AMOUNT} $BEST</strong>{" "}
        tokens.
      </p>
      {/* Primary: Gasless claim */}
      <button
        type="button"
        onClick={onGaslessClaim}
        className="w-full rounded-xl bg-primary text-primary-foreground px-6 py-4 font-sans text-base font-semibold hover:shadow-[0_0_30px_var(--color-glow)] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="inline-flex items-center gap-2">
          <DropletsIcon className="size-5" />
          Claim Gasless
        </span>
      </button>
      <p className="text-xs text-muted-foreground">
        No gas required — sponsored by Gater Robot
      </p>
      {/* Secondary: Manual claim */}
      <button
        type="button"
        onClick={onManualClaim}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-transparent text-muted-foreground px-4 py-2 text-xs font-mono hover:bg-primary/5 hover:text-foreground active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <WalletIcon className="size-3.5" />
        Claim with Gas
      </button>
    </>
  )
}
