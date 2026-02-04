/**
 * ConnectWallet - Wallet connection component
 *
 * Allows users to connect their wallet via MetaMask or WalletConnect.
 * Shows connection status and allows disconnection.
 */

import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet, LogOut, Loader2, ChevronDown } from 'lucide-react'
import { useState } from 'react'

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  8453: 'Base',
  42161: 'Arbitrum',
  11155111: 'Sepolia',
}

// Shared utility for formatting addresses
const formatAddress = (addr: string, prefixLen = 6, suffixLen = 4) => {
  return `${addr.slice(0, prefixLen)}...${addr.slice(-suffixLen)}`
}

export function ConnectWallet() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const [showConnectors, setShowConnectors] = useState(false)

  const chainName = chainId ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : 'Unknown'

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-md text-sm">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">{chainName}</span>
          <span className="font-mono">{formatAddress(address)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => disconnect()}
          title="Disconnect wallet"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  if (isConnecting || isPending) {
    return (
      <Button disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Connecting...
      </Button>
    )
  }

  // Show connector options
  if (showConnectors) {
    return (
      <div className="flex flex-col gap-2">
        {connectors.map((connector) => (
          <Button
            key={connector.uid}
            variant="outline"
            onClick={() => {
              connect({ connector })
              setShowConnectors(false)
            }}
            className="justify-start"
          >
            <Wallet className="h-4 w-4 mr-2" />
            {connector.name}
          </Button>
        ))}
        <Button
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
    <Button onClick={() => setShowConnectors(true)}>
      <Wallet className="h-4 w-4 mr-2" />
      Connect Wallet
      <ChevronDown className="h-4 w-4 ml-1" />
    </Button>
  )
}

/**
 * Compact version for use in headers/navbars
 */
export function ConnectWalletCompact() {
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => disconnect()}
        className="font-mono"
      >
        {formatAddress(address, 4, 4)}
      </Button>
    )
  }

  if (isConnecting || isPending) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-3 w-3 animate-spin" />
      </Button>
    )
  }

  // Default to first connector (usually injected/MetaMask)
  const defaultConnector = connectors[0]

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => defaultConnector && connect({ connector: defaultConnector })}
    >
      <Wallet className="h-3 w-3 mr-1" />
      Connect
    </Button>
  )
}
