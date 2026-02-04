/**
 * SIWEButton - Sign-In With Ethereum Button Component
 *
 * Provides a button for wallet verification using SIWE.
 * Shows different states during the verification process:
 * - idle: Ready to verify
 * - generating_nonce: Preparing verification
 * - awaiting_signature: Waiting for wallet signature
 * - verifying: Validating signature
 * - success: Verification complete
 * - error: Verification failed
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ShieldCheck, ShieldAlert, Shield } from 'lucide-react'
import { useSIWE, type SIWEStatus } from '@/hooks/useSIWE'

/**
 * Props for SIWEButton component
 */
export interface SIWEButtonProps {
  /** Callback when verification succeeds */
  onSuccess?: () => void
  /** Callback when verification fails */
  onError?: (error: string) => void
  /** Custom class name for the button */
  className?: string
}

/**
 * Get button text based on SIWE status
 */
function getStatusText(status: SIWEStatus): string {
  switch (status) {
    case 'idle':
      return 'Verify Wallet'
    case 'generating_nonce':
      return 'Preparing...'
    case 'awaiting_signature':
      return 'Sign in Wallet'
    case 'verifying':
      return 'Verifying...'
    case 'success':
      return 'Verified!'
    case 'error':
      return 'Try Again'
    default:
      return 'Verify Wallet'
  }
}

/**
 * Get button icon based on SIWE status
 */
function getStatusIcon(status: SIWEStatus) {
  switch (status) {
    case 'generating_nonce':
    case 'awaiting_signature':
    case 'verifying':
      return <Loader2 className="h-4 w-4 animate-spin" />
    case 'success':
      return <ShieldCheck className="h-4 w-4" />
    case 'error':
      return <ShieldAlert className="h-4 w-4" />
    default:
      return <Shield className="h-4 w-4" />
  }
}

/**
 * Get button variant based on SIWE status
 */
function getStatusVariant(status: SIWEStatus): 'default' | 'success' | 'destructive' | 'outline' {
  switch (status) {
    case 'success':
      return 'success'
    case 'error':
      return 'destructive'
    default:
      return 'default'
  }
}

/**
 * SIWEButton - Button component for wallet verification
 *
 * @example
 * ```tsx
 * function WalletCard() {
 *   return (
 *     <SIWEButton
 *       onSuccess={() => console.log('Wallet verified!')}
 *       onError={(err) => console.error('Verification failed:', err)}
 *     />
 *   )
 * }
 * ```
 */
export function SIWEButton({ onSuccess, onError, className }: SIWEButtonProps) {
  const { status, error, verify, reset, isVerifying, isSuccess, isError } = useSIWE()

  // Call callbacks when status changes
  useEffect(() => {
    if (isSuccess && onSuccess) {
      onSuccess()
    }
  }, [isSuccess, onSuccess])

  useEffect(() => {
    if (isError && error && onError) {
      onError(error)
    }
  }, [isError, error, onError])

  const handleClick = () => {
    if (isError) {
      // Reset and try again on error
      reset()
      // Small delay to ensure reset completes before starting new verification
      setTimeout(() => verify(), 100)
    } else if (!isVerifying && !isSuccess) {
      verify()
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant={getStatusVariant(status)}
        onClick={handleClick}
        disabled={isVerifying || isSuccess}
        className={className}
      >
        {getStatusIcon(status)}
        <span className="ml-2">{getStatusText(status)}</span>
      </Button>

      {/* Show error message */}
      {isError && error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Show success message */}
      {isSuccess && (
        <p className="text-sm text-green-600">Wallet successfully linked to your account!</p>
      )}
    </div>
  )
}
