/**
 * Error Parsing Utilities
 *
 * Parses viem/wagmi errors into user-friendly messages.
 */

import { BaseError as BaseViemError, ContractFunctionRevertedError } from 'viem'

/**
 * Parse a viem/wagmi error to get a displayable string
 *
 * @param error - Error object from viem/wagmi
 * @returns User-friendly error message
 */
export function getParsedError(error: unknown): string {
  // Handle null/undefined
  if (!error) {
    return 'An unknown error occurred'
  }

  // Walk the error chain if possible
  const parsedError =
    error && typeof error === 'object' && 'walk' in error && typeof (error as any).walk === 'function'
      ? (error as any).walk()
      : error

  // Handle viem base errors
  if (parsedError instanceof BaseViemError) {
    // Try details first (most specific)
    if (parsedError.details) {
      return parsedError.details
    }

    // Try short message with custom error handling
    if (parsedError.shortMessage) {
      // Handle contract revert errors specially
      if (
        parsedError instanceof ContractFunctionRevertedError &&
        parsedError.data &&
        parsedError.data.errorName !== 'Error'
      ) {
        const customErrorArgs = parsedError.data.args?.toString() ?? ''
        return `${parsedError.shortMessage.replace(/reverted\.$/, 'reverted with the following reason:')}\n${parsedError.data.errorName}(${customErrorArgs})`
      }

      return parsedError.shortMessage
    }

    // Fall back to message or name
    return parsedError.message ?? parsedError.name ?? 'An unknown error occurred'
  }

  // Handle standard Error objects
  if (parsedError instanceof Error) {
    return parsedError.message
  }

  // Handle objects with message property
  if (parsedError && typeof parsedError === 'object' && 'message' in parsedError) {
    return String((parsedError as { message: unknown }).message)
  }

  // Last resort: stringify
  return 'An unknown error occurred'
}

/**
 * Check if an error is a user rejection (e.g., user canceled MetaMask)
 */
export function isUserRejectionError(error: unknown): boolean {
  if (!error) return false

  try {
    // Check for EIP-1193 error code 4001 (User Rejected Request)
    if (typeof error === 'object' && error !== null) {
      // Direct code check
      if ('code' in error && (error as { code: number }).code === 4001) {
        return true
      }

      // Walk the error chain
      if ('walk' in error && typeof (error as any).walk === 'function') {
        const walked = (error as any).walk((e: any) => e?.code === 4001)
        if (walked) return true
      }

      // Check short message or message
      const message =
        ('shortMessage' in error ? (error as { shortMessage: string }).shortMessage : '') ||
        ('message' in error ? (error as { message: string }).message : '')

      if (typeof message === 'string') {
        return /user rejected|denied transaction signature|user denied/i.test(message)
      }
    }
  } catch {
    // Ignore errors during error checking
  }

  return false
}

/**
 * Extract error code from an error object
 */
export function getErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined

  if ('code' in error && typeof (error as { code: unknown }).code === 'number') {
    return (error as { code: number }).code
  }

  return undefined
}
