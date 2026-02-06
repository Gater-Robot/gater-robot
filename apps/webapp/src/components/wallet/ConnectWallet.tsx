import { cn } from "@/lib/utils"

export function ConnectWallet({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center", className)}>
      <appkit-button />
    </div>
  )
}
