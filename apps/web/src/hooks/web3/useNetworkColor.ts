/**
 * useNetworkColor Hook
 *
 * Gets the theme-aware color for a network.
 */

import { useMemo } from 'react'
import { useSelectedNetwork } from './useTargetNetwork'
import { getNetworkColor, DEFAULT_NETWORK_COLOR, type ChainWithIcon } from '@/config/chains'

// Re-export for backwards compatibility
export { DEFAULT_NETWORK_COLOR }

/**
 * Get network color utility function
 *
 * @param network - Chain configuration
 * @param isDarkMode - Whether dark mode is active
 * @returns Color string for the network
 */
export function getNetworkColorFromChain(
  network: ChainWithIcon,
  isDarkMode: boolean
): string {
  return getNetworkColor(network.id, isDarkMode)
}

/**
 * Hook to get the color for a network
 *
 * @param chainId - Optional chain ID (uses current if not provided)
 * @param isDarkMode - Whether dark mode is active (defaults to true)
 * @returns Color string for the network
 */
export function useNetworkColor(chainId?: number, isDarkMode = true): string {
  const chain = useSelectedNetwork(chainId)

  return useMemo(() => {
    return getNetworkColor(chain.id, isDarkMode)
  }, [chain.id, isDarkMode])
}
