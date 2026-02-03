/**
 * Balance Component
 *
 * Displays ETH/native currency balance with optional USD conversion.
 */

import { useState } from 'react'
import { formatEther, type Address } from 'viem'
import { useWatchBalance, useTargetNetwork } from '@/hooks/web3'
import { useWeb3Store } from '@/store/web3Store'
import { cn } from '@/lib/utils'

interface BalanceProps {
  /** Address to show balance for */
  address?: Address
  /** Additional class names */
  className?: string
  /** Start in USD mode */
  usdMode?: boolean
}

/**
 * Balance display component
 *
 * Shows native currency balance with click-to-toggle USD mode.
 */
export function Balance({ address, className, usdMode = false }: BalanceProps) {
  const { targetNetwork } = useTargetNetwork()
  const nativeCurrencyPrice = useWeb3Store((state) => state.nativeCurrency.price)
  const isFetching = useWeb3Store((state) => state.nativeCurrency.isFetching)

  const [displayUsdMode, setDisplayUsdMode] = useState(usdMode)

  const { data: balance, isError, isLoading } = useWatchBalance({ address })

  // Loading state
  if (!address || isLoading || balance === null || (isFetching && nativeCurrencyPrice === 0)) {
    return (
      <div className={cn('animate-pulse flex items-center gap-2', className)}>
        <div className="h-4 w-4 rounded-full bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
    )
  }

  // Error state
  if (isError) {
    return (
      <div className={cn('text-destructive text-sm', className)}>
        Error loading balance
      </div>
    )
  }

  const formattedBalance = balance ? Number(formatEther(balance.value)) : 0
  const usdValue = formattedBalance * nativeCurrencyPrice

  const toggleMode = () => setDisplayUsdMode((prev) => !prev)

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={cn(
        'flex items-center gap-1 text-sm font-medium hover:opacity-80 transition-opacity',
        className
      )}
    >
      {displayUsdMode ? (
        <>
          <span className="text-xs font-bold">$</span>
          <span>{usdValue.toFixed(2)}</span>
        </>
      ) : (
        <>
          <span>{formattedBalance.toFixed(4)}</span>
          <span className="text-xs font-bold ml-0.5">
            {targetNetwork.nativeCurrency.symbol}
          </span>
        </>
      )}
    </button>
  )
}

export default Balance
