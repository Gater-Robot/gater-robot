/**
 * useSIWE - Sign-In With Ethereum Hook
 *
 * Handles the complete SIWE flow for wallet verification:
 * 1. Generate nonce from Convex backend
 * 2. Create SIWE message with viem/siwe
 * 3. Request signature from wallet via wagmi
 * 4. Verify signature on Convex backend
 *
 * The wallet is bound to the user's Telegram account upon successful verification.
 */

import { useState, useCallback } from 'react'
import { useAccount, useChainId, useSignMessage } from 'wagmi'
import { useMutation } from 'convex/react'
import { createSiweMessage } from 'viem/siwe'
import { api } from '@/convex/api'
import { useTelegram } from '@/contexts/TelegramContext'

/**
 * SIWE verification status states
 */
export type SIWEStatus =
  | 'idle'
  | 'generating_nonce'
  | 'awaiting_signature'
  | 'verifying'
  | 'success'
  | 'error'

/**
 * SIWE hook return type
 */
export interface UseSIWEReturn {
  /** Current status of the SIWE flow */
  status: SIWEStatus
  /** Error message if status is 'error' */
  error: string | null
  /** Start the verification process */
  verify: () => Promise<void>
  /** Reset to idle state */
  reset: () => void
  /** Whether verification is in progress */
  isVerifying: boolean
  /** Whether verification was successful */
  isSuccess: boolean
  /** Whether an error occurred */
  isError: boolean
}

/**
 * Hook to handle SIWE wallet verification
 *
 * @example
 * ```tsx
 * function WalletVerification() {
 *   const { verify, status, error, reset } = useSIWE()
 *
 *   return (
 *     <div>
 *       <button onClick={verify} disabled={status !== 'idle'}>
 *         Verify Wallet
 *       </button>
 *       {status === 'error' && <p>Error: {error}</p>}
 *       {status === 'success' && <p>Wallet verified!</p>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useSIWE(): UseSIWEReturn {
  const [status, setStatus] = useState<SIWEStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Wagmi hooks
  const { address } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()

  // Telegram context for initDataRaw
  const { getInitData } = useTelegram()

  // Convex mutations
  const generateNonce = useMutation(api.siwe.generateNonce)
  const verifySignature = useMutation(api.siwe.verifySignature)

  /**
   * Reset the hook to idle state
   */
  const reset = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  /**
   * Execute the full SIWE verification flow
   */
  const verify = useCallback(async () => {
    // Reset any previous error
    setError(null)

    // Validate prerequisites
    if (!address) {
      setError('No wallet connected')
      setStatus('error')
      return
    }

    const initDataRaw = getInitData()
    if (!initDataRaw) {
      setError('Not authenticated with Telegram')
      setStatus('error')
      return
    }

    try {
      // Step 1: Generate nonce from backend
      setStatus('generating_nonce')
      const nonceResult = await generateNonce({
        address,
        initDataRaw,
      })

      // Step 2: Create SIWE message
      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to Gater Robot to verify wallet ownership.',
        uri: window.location.origin,
        version: '1',
        chainId,
        nonce: nonceResult.nonce,
      })

      // Step 3: Request signature from wallet
      setStatus('awaiting_signature')
      const signature = await signMessageAsync({
        message,
      })

      // Step 4: Verify signature on backend
      setStatus('verifying')
      const verifyResult = await verifySignature({
        address,
        message,
        signature,
        initDataRaw,
      })

      if (verifyResult.success) {
        setStatus('success')
      } else {
        setError('Verification failed')
        setStatus('error')
      }
    } catch (err) {
      // Handle user rejection (common when user cancels signature)
      if (err instanceof Error) {
        if (err.message.includes('User rejected') || err.message.includes('user rejected')) {
          setError('Signature request was cancelled')
        } else {
          setError(err.message)
        }
      } else {
        setError('An unexpected error occurred')
      }
      setStatus('error')
    }
  }, [address, chainId, generateNonce, getInitData, signMessageAsync, verifySignature])

  return {
    status,
    error,
    verify,
    reset,
    isVerifying: status === 'generating_nonce' || status === 'awaiting_signature' || status === 'verifying',
    isSuccess: status === 'success',
    isError: status === 'error',
  }
}
