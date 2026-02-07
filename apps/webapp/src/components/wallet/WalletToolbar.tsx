import { useAccount } from "wagmi"
import { PulseDot } from "@/components/ui/pulse-dot"

export function WalletToolbar() {
  const { isConnected } = useAccount()

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-[var(--color-surface)]">
      <div className="flex items-center gap-2">
        {isConnected && <PulseDot color="bg-success" size="sm" />}
        {/* @ts-ignore - web component */}
        <appkit-network-button />
        {/* @ts-ignore - web component */}
        <appkit-button />
      </div>
    </div>
  )
}
