import { SectionHeader } from "@/components/ui/section-header"
import { FAUCET_AMOUNT, BEST_TOKEN_ADDRESS, truncateAddress } from "./constants"

export function AboutSection({
  isContractConfigured,
}: {
  isContractConfigured: boolean
}) {
  return (
    <div className="space-y-3 fade-up stagger-4">
      <SectionHeader>About $BEST</SectionHeader>

      <div className="rounded-xl border border-border bg-[var(--color-surface-alt)] p-4">
        <p className="text-sm text-muted-foreground mb-4">
          <strong className="text-foreground">$BEST</strong> (Best Token) is the utility token for Gater Robot,
          used for token-gating Telegram groups and premium features.
        </p>

        <div className="space-y-0">
          <div className="flex justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">Faucet amount</span>
            <span className="font-mono text-sm text-foreground">{FAUCET_AMOUNT} tokens</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">Standard</span>
            <span className="font-mono text-sm text-foreground">ERC-20</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/30">
            <span className="text-sm text-muted-foreground">Network</span>
            <span className="font-mono text-sm text-foreground">Base / Base Sepolia</span>
          </div>
          <div className="flex justify-between py-2 last:border-0">
            <span className="text-sm text-muted-foreground">Contract</span>
            <span className="font-mono text-sm text-foreground">
              {isContractConfigured ? truncateAddress(BEST_TOKEN_ADDRESS) : "Not deployed"}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
