import { FAUCET_AMOUNT } from "./constants"

export function FaucetHero() {
  return (
    <div className="text-center py-6">
      <span className="font-mono text-5xl font-bold text-primary drop-shadow-[0_0_12px_var(--color-glow)]">
        {FAUCET_AMOUNT}
      </span>
      <div className="font-mono text-lg text-muted-foreground mt-1">$BEST</div>
      <p className="text-sm text-muted-foreground mt-2">
        Each address can claim once. Connect a wallet to get started.
      </p>
    </div>
  )
}
