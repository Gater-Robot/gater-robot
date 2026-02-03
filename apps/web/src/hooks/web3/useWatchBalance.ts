/**
 * useWatchBalance Hook
 *
 * Wrapper around wagmi's useBalance that auto-updates on new blocks.
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBalance, useBlockNumber, type UseBalanceParameters } from 'wagmi'
import { useTargetNetwork } from './useTargetNetwork'

/**
 * Watch balance hook that updates on every block
 *
 * @param params - useBalance parameters
 * @returns Balance data, loading, and error states
 */
export function useWatchBalance(params: UseBalanceParameters) {
  const { targetNetwork } = useTargetNetwork()
  const queryClient = useQueryClient()

  // Watch for new blocks
  const { data: blockNumber } = useBlockNumber({
    watch: true,
    chainId: targetNetwork.id,
  })

  // Get balance
  const { queryKey, ...balanceReturn } = useBalance(params)

  // Invalidate balance query on new block
  useEffect(() => {
    if (blockNumber) {
      queryClient.invalidateQueries({ queryKey })
    }
  }, [blockNumber, queryClient, queryKey])

  return balanceReturn
}
