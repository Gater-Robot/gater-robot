/**
 * useNetworkColor Hook
 *
 * Gets the theme-aware color for a network.
 */

import { useMemo } from 'react'
import { useSelectedNetwork } from './useTargetNetwork'
import { getNetworkColor, type ChainWithIcon } from '@/config/chains'

/**
 * Default network colors for light and dark themes
 */
export const DEFAULT_NETWORK_COLOR: [string, string] = ['#666666', '#bbbbbb']

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
