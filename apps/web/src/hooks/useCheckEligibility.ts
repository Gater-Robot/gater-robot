/**
 * useCheckEligibility - Hook for checking user eligibility for gated channels
 *
 * Provides functionality to:
 * - Check eligibility for a specific channel
 * - Fetch token balance and threshold information
 * - Track loading, error, and result states
 *
 * Uses Convex action to fetch on-chain balances and compare against gate thresholds.
 */

import { useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { useTelegram } from '@/contexts/TelegramContext'
import { useState, useCallback } from 'react'

/**
 * Eligibility check result from Convex
 */
export interface EligibilityResult {
  /** Whether user exists in the system */
  hasUser: boolean
  /** Whether user has at least one verified wallet */
  hasVerifiedWallet: boolean
  /** Whether the channel has an active gate */
  hasActiveGate: boolean
  /** Whether user meets the token threshold */
  isEligible: boolean
  /** Current membership status if exists */
  membershipStatus: string | null
  /** Raw token balance (wei/smallest unit) */
  balance: string
  /** Human-readable formatted balance */
  formattedBalance: string
  /** Raw threshold requirement */
  threshold: string
  /** Human-readable formatted threshold */
  formattedThreshold: string
  /** Token symbol (e.g., "USDC", "ETH") */
  tokenSymbol: string
  /** Chain name (e.g., "Ethereum", "Polygon") */
  chainName: string
}

/**
 * Return type for useCheckEligibility hook
 */
export interface UseCheckEligibilityResult {
  /** Trigger eligibility check for a channel */
  check: (channelId: Id<'channels'>) => Promise<void>
  /** Result of the last eligibility check */
  result: EligibilityResult | null
  /** Whether a check is currently in progress */
  isChecking: boolean
  /** Error from the check if any */
  error: Error | null
  /** Reset the hook to initial state */
  reset: () => void
}

/**
 * Hook to check user eligibility for gated channels
 *
 * @returns UseCheckEligibilityResult with check function and result data
 *
 * @example
 * ```tsx
 * function EligibilityChecker({ channelId }) {
 *   const { check, result, isChecking, error, reset } = useCheckEligibility()
 *
 *   return (
 *     <div>
 *       <button onClick={() => check(channelId)} disabled={isChecking}>
 *         Check Eligibility
 *       </button>
 *       {result && (
 *         <div>
 *           {result.isEligible ? 'Eligible!' : 'Not Eligible'}
 *           <p>Balance: {result.formattedBalance} {result.tokenSymbol}</p>
 *           <p>Required: {result.formattedThreshold} {result.tokenSymbol}</p>
 *         </div>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useCheckEligibility(): UseCheckEligibilityResult {
  const { user, isLoading: telegramLoading } = useTelegram()
  const [result, setResult] = useState<EligibilityResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Convex action for checking eligibility
  const checkEligibilityAction = useAction(api.eligibility.getChannelEligibilityStatus)

  /**
   * Reset the hook to initial state
   */
  const reset = useCallback(() => {
    setResult(null)
    setIsChecking(false)
    setError(null)
  }, [])

  /**
   * Check eligibility for a specific channel
   */
  const check = useCallback(
    async (channelId: Id<'channels'>) => {
      // Validate prerequisites
      if (telegramLoading) {
        setError(new Error('Telegram SDK is still loading'))
        return
      }

      if (!user) {
        setError(new Error('Not authenticated with Telegram'))
        return
      }

      setIsChecking(true)
      setError(null)

      try {
        const eligibilityResult = await checkEligibilityAction({
          telegramUserId: user.id.toString(),
          channelId,
        })

        setResult(eligibilityResult)
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Failed to check eligibility')
        setError(errorObj)
        setResult(null)
      } finally {
        setIsChecking(false)
      }
    },
    [user, telegramLoading, checkEligibilityAction]
  )

  return {
    check,
    result,
    isChecking,
    error,
    reset,
  }
}
