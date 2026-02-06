import { useAccount } from "wagmi"
import { cn } from "@/lib/utils"
import { PulseDot } from "@/components/ui/pulse-dot"

export function ConnectWallet({ className }: { className?: string }) {
  const { isConnected } = useAccount()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isConnected && <PulseDot color="bg-success" size="sm" />}
      {/* @ts-ignore - web component */}
      <appkit-button />
    </div>
  )
}
