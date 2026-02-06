import * as React from "react"
import { getChainLabel } from "@gater/chain-registry"
import { ChevronDownIcon, Loader2Icon, LogOutIcon, WalletIcon } from "lucide-react"
import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatAddress(address: string, prefixLen = 6, suffixLen = 4) {
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`
}

export function ConnectWallet({ className }: { className?: string }) {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const [showConnectors, setShowConnectors] = React.useState(false)

  const chainName = chainId ? getChainLabel(chainId) : "Unknown"

  if (isConnected && address) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="bg-muted flex items-center gap-2 rounded-md px-3 py-2 text-sm">
          <div className="size-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">{chainName}</span>
          <span className="font-mono">{formatAddress(address)}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => disconnect()}
          title="Disconnect wallet"
        >
          <LogOutIcon className="size-4" />
        </Button>
      </div>
    )
  }

  if (isConnecting || isPending) {
    return (
      <Button type="button" disabled className={className}>
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Connecting…
      </Button>
    )
  }

  if (showConnectors) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {connectors.map((connector) => (
          <Button
            key={connector.uid}
            type="button"
            variant="secondary"
            onClick={() => {
              connect({ connector })
              setShowConnectors(false)
            }}
            className="justify-start"
          >
            <WalletIcon className="mr-2 size-4" />
            {connector.name}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowConnectors(false)}
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <Button type="button" onClick={() => setShowConnectors(true)} className={className}>
      <WalletIcon className="mr-2 size-4" />
      Connect Wallet
      <ChevronDownIcon className="ml-1 size-4" />
    </Button>
  )
}

