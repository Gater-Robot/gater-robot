/**
 * Pure utility functions for faucet claim processing.
 * No "use node" directive — these are side-effect-free helpers.
 */

/** Deterministic error substrings that should NOT be retried. */
const DETERMINISTIC_ERROR_PATTERNS = [
  "faucet already claimed",
  "ownableunauthorizedaccount",
  "insufficient funds",
  "execution reverted",
] as const

/**
 * Returns true if the error message indicates a transient (retryable) failure.
 * Deterministic failures (already claimed, unauthorized, insufficient funds,
 * execution reverted) return false.
 */
export function isRetryableError(message: string): boolean {
  const lower = message.toLowerCase()
  return !DETERMINISTIC_ERROR_PATTERNS.some((pattern) => lower.includes(pattern))
}

/** Retry configuration for faucet claim transactions. */
export const FAUCET_RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_BASE_MS: 2000,
} as const
