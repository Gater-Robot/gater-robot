/**
 * useTransactor Hook
 *
 * Runs transactions with UI feedback via notifications.
 * Handles loading states, errors, and success confirmations.
 */

import { useState, useCallback } from 'react'
import { getPublicClient } from '@wagmi/core'
import { type Hash, type TransactionReceipt, type WalletClient } from 'viem'
import { useWalletClient } from 'wagmi'
import { wagmiConfig } from '@/config/wagmi'
import { notification } from '@/utils/notifications'
import { getBlockExplorerTxLink } from '@/utils/networks'
import { getParsedError, isUserRejectionError } from '@/utils/errors'

interface TransactorOptions {
  /** Number of block confirmations to wait for */
  blockConfirmations?: number
  /** Callback when transaction is confirmed */
  onBlockConfirmation?: (receipt: TransactionReceipt) => void
}

type TransactionFunc = (
  tx: (() => Promise<Hash>) | { to: `0x${string}`; value?: bigint; data?: `0x${string}` },
  options?: TransactorOptions
) => Promise<Hash | undefined>

/**
 * Hook for executing transactions with UI feedback
 *
 * @param _walletClient - Optional wallet client override
 * @returns Transaction executor function
 */
export function useTransactor(_walletClient?: WalletClient): TransactionFunc {
  const { data: walletClientFromHook } = useWalletClient()
  const walletClient = _walletClient ?? walletClientFromHook

  const transactor: TransactionFunc = useCallback(
    async (tx, options) => {
      if (!walletClient) {
        notification.error('Wallet not connected')
        return undefined
      }

      let notificationId: string | null = null
      let transactionHash: Hash | undefined
      let transactionReceipt: TransactionReceipt | undefined
      let blockExplorerTxURL = ''

      try {
        const chainId = await walletClient.getChainId()
        const publicClient = getPublicClient(wagmiConfig)

        if (!publicClient) {
          throw new Error('Public client not available')
        }

        // Show pending notification
        notificationId = notification.loading('Awaiting wallet confirmation...')

        // Execute transaction
        if (typeof tx === 'function') {
          transactionHash = await tx()
        } else {
          transactionHash = await walletClient.sendTransaction({
            to: tx.to,
            value: tx.value,
            data: tx.data,
          })
        }

        notification.remove(notificationId)

        // Get block explorer link
        blockExplorerTxURL = getBlockExplorerTxLink(chainId, transactionHash)

        // Show waiting for confirmation
        notificationId = notification.loading(
          blockExplorerTxURL
            ? `Transaction submitted. Waiting for confirmation...`
            : 'Waiting for transaction confirmation...'
        )

        // Wait for receipt
        transactionReceipt = await publicClient.waitForTransactionReceipt({
          hash: transactionHash,
          confirmations: options?.blockConfirmations,
        })

        notification.remove(notificationId)

        // Check if reverted
        if (transactionReceipt.status === 'reverted') {
          throw new Error('Transaction reverted')
        }

        // Success notification
        notification.success('Transaction completed successfully!')

        // Call confirmation callback
        if (options?.onBlockConfirmation) {
          options.onBlockConfirmation(transactionReceipt)
        }

        return transactionHash
      } catch (error) {
        if (notificationId) {
          notification.remove(notificationId)
        }

        // Don't log user rejections
        if (!isUserRejectionError(error)) {
          console.error('Transaction error:', error)
        }

        const message = getParsedError(error)

        // Show error with explorer link if transaction was submitted but reverted
        if (transactionReceipt?.status === 'reverted' && blockExplorerTxURL) {
          notification.error(`${message}. View on explorer.`)
          throw error
        }

        notification.error(message)
        throw error
      }
    },
    [walletClient]
  )

  return transactor
}

/**
 * Hook state for tracking transaction status
 */
export function useTransactionState() {
  const [isPending, setIsPending] = useState(false)
  const [hash, setHash] = useState<Hash | undefined>()
  const [error, setError] = useState<string | undefined>()

  const reset = useCallback(() => {
    setIsPending(false)
    setHash(undefined)
    setError(undefined)
  }, [])

  return {
    isPending,
    setIsPending,
    hash,
    setHash,
    error,
    setError,
    reset,
  }
}
