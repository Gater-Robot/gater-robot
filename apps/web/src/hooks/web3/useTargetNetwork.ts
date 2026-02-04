/**
 * useTargetNetwork Hook
 *
 * Retrieves the currently connected network and keeps
 * the global store in sync with the wallet's chain.
 */

import { useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { useWeb3Store } from '@/store/web3Store'
import { supportedChains, NETWORK_COLORS, type ChainWithIcon } from '@/config/chains'

/**
 * Hook to get and track the target network
 *
 * Automatically syncs the global store when the wallet changes chains.
 *
 * @returns Object containing the target network with extra metadata
 */
export function useTargetNetwork(): { targetNetwork: ChainWithIcon } {
  const { chain } = useAccount()
  const targetNetwork = useWeb3Store((state) => state.targetNetwork)
  const setTargetNetwork = useWeb3Store((state) => state.setTargetNetwork)

  // Sync global state with connected wallet chain
  useEffect(() => {
    if (!chain?.id) return

    const newNetwork = supportedChains.find((n) => n.id === chain.id)
    if (!newNetwork) return

    // Only update if different
    if (newNetwork.id !== targetNetwork.id) {
      setTargetNetwork(newNetwork)
    }
  }, [chain?.id, setTargetNetwork, targetNetwork.id])

  // Memoize return value with extra metadata
  return useMemo(
    () => ({
      targetNetwork: {
        ...targetNetwork,
        color: NETWORK_COLORS[targetNetwork.id],
      },
    }),
    [targetNetwork]
  )
}

/**
 * Hook to get a specific network by chain ID
 *
 * @param chainId - Chain ID to look up
 * @returns The chain configuration or first supported chain as fallback
 */
export function useSelectedNetwork(chainId?: number): ChainWithIcon {
  return useMemo(() => {
    if (!chainId) return supportedChains[0]

    const network = supportedChains.find((n) => n.id === chainId)
    if (!network) {
      console.warn(
        `[useTargetNetwork] useSelectedNetwork: Chain ${chainId} is not supported, falling back to ${supportedChains[0].name} (${supportedChains[0].id})`
      )
      return supportedChains[0]
    }
    return network
  }, [chainId])
}
