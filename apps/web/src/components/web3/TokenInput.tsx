/**
 * TokenInput Component
 *
 * Token address input with automatic validation and metadata fetching.
 * Detects ERC20 tokens and displays name, symbol, decimals, and balance.
 */

import { useEffect, useState, useCallback } from 'react'
import { isAddress, erc20Abi, formatUnits, type Address } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'
import { ExternalLink, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useTargetNetwork } from '@/hooks/web3'
import { getBlockExplorerAddressLink } from '@/utils/networks'
import { cn } from '@/lib/utils'

/**
 * Token metadata interface
 */
export interface TokenInfo {
  address: Address
  name: string
  symbol: string
  decimals: number
  balance: string
}

interface TokenInputProps {
  /** Current token address value */
  value: string
  /** Callback when address changes */
  onChange: (address: string) => void
  /** Callback when token is validated */
  onTokenDetected?: (token: TokenInfo | null) => void
  /** Additional class names */
  className?: string
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
}

/**
 * Token address input with automatic detection
 */
export function TokenInput({
  value,
  onChange,
  onTokenDetected,
  className,
  placeholder = '0x...',
  disabled = false,
}: TokenInputProps) {
  const { address: walletAddress } = useAccount()
  const { targetNetwork } = useTargetNetwork()
  const publicClient = usePublicClient({ chainId: targetNetwork.id })

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidAddress = value ? isAddress(value, { strict: false }) : false
  const showInvalidFormat = value.length > 0 && !isValidAddress
  const showNotFound = isValidAddress && !isChecking && !tokenInfo && !error

  // Fetch token metadata when address changes
  const fetchTokenInfo = useCallback(async () => {
    if (!isValidAddress || !publicClient) {
      setTokenInfo(null)
      setError(null)
      return
    }

    setIsChecking(true)
    setTokenInfo(null)
    setError(null)

    try {
      const tokenAddress = value as Address

      const [name, symbol, decimals, balance] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'name',
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        walletAddress
          ? publicClient.readContract({
              address: tokenAddress,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [walletAddress],
            })
          : 0n,
      ])

      const formattedBalance = Number(formatUnits(balance as bigint, decimals as number)).toFixed(4)

      const info: TokenInfo = {
        address: tokenAddress,
        name: name as string,
        symbol: symbol as string,
        decimals: decimals as number,
        balance: formattedBalance,
      }

      setTokenInfo(info)
      setError(null)
      onTokenDetected?.(info)
    } catch (err) {
      console.error('Failed to fetch token metadata:', err)
      setError(`Token not found on ${targetNetwork.name}`)
      setTokenInfo(null)
      onTokenDetected?.(null)
    } finally {
      setIsChecking(false)
    }
  }, [value, isValidAddress, publicClient, walletAddress, targetNetwork.name, onTokenDetected])

  // Debounced fetch on value change
  useEffect(() => {
    const timer = setTimeout(fetchTokenInfo, 500)
    return () => clearTimeout(timer)
  }, [fetchTokenInfo])

  const explorerLink = tokenInfo
    ? getBlockExplorerAddressLink(targetNetwork.id, tokenInfo.address)
    : null

  return (
    <div className={cn('space-y-3', className)}>
      {/* Input */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-3 rounded-lg border bg-background font-mono text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-destructive',
            tokenInfo && 'border-green-500/50'
          )}
        />
        {isChecking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {tokenInfo && !isChecking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>

      {/* Validation messages */}
      {showInvalidFormat && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Invalid EVM address format
        </p>
      )}

      {showNotFound && (
        <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
          <p className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            No token contract detected at this address on{' '}
            <strong>{targetNetwork.name}</strong>
          </p>
          <p className="mt-1 text-muted-foreground text-xs">
            Verify the address and ensure you're connected to the correct network.
          </p>
        </div>
      )}

      {error && !showNotFound && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Token info card */}
      {tokenInfo && (
        <div className="p-4 rounded-lg border bg-card space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{tokenInfo.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Symbol</span>
            <span className="font-medium">{tokenInfo.symbol}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Decimals</span>
            <span className="font-medium">{tokenInfo.decimals}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Your Balance</span>
            <span className="font-medium">
              {tokenInfo.balance} {tokenInfo.symbol}
            </span>
          </div>
          {explorerLink && (
            <div className="pt-2 border-t">
              <a
                href={explorerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                View on Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TokenInput
