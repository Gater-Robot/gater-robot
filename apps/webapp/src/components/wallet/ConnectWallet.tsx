import { useAccount } from "wagmi"
import { cn } from "@/lib/utils"

export function ConnectWallet({ className }: { className?: string }) {
  const { isConnected } = useAccount()

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isConnected && (
        <span
          className="inline-block size-2 rounded-full bg-success pulse-dot"
        />
      )}
      {/* @ts-ignore - web component */}
      <appkit-button />
    </div>
  )
}
