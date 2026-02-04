/**
 * LiFi Widget Configuration
 *
 * Configures the LiFi Widget for token swaps to meet gate requirements.
 * Supports cross-chain swaps with a pre-configured destination token.
 */

import type { WidgetConfig } from '@lifi/widget'

/**
 * Creates a gate-specific widget configuration
 *
 * @param _gateName - Display name of the gate (for UI reference, reserved for future use)
 * @param tokenAddress - Target token contract address
 * @param chainId - Target chain ID
 * @param amountNeeded - Amount needed in human-readable format (e.g., "100")
 * @param decimals - Token decimals for conversion
 * @returns Configured WidgetConfig for the gate
 */
/**
 * Converts a human-readable amount string to wei (smallest unit) using BigInt
 * This avoids floating point precision errors that occur with parseFloat
 *
 * @param amount - Amount in human-readable format (e.g., "100.5")
 * @param decimals - Token decimals (e.g., 18)
 * @returns Amount in wei as a string
 */
function toWei(amount: string, decimals: number): string {
  const [whole, fraction = ''] = amount.split('.')
  // Pad or trim fraction to match decimals
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)
  // Combine whole and fraction, remove leading zeros
  const combined = whole + paddedFraction
  // Remove leading zeros but keep at least one digit
  const trimmed = combined.replace(/^0+/, '') || '0'
  return trimmed
}

export function createGateWidgetConfig(
  _gateName: string,
  tokenAddress: string,
  chainId: number,
  amountNeeded: string,
  decimals: number
): WidgetConfig {
  // Convert human-readable amount to wei/smallest unit using BigInt-safe conversion
  const amountInWei = toWei(amountNeeded, decimals)

  return {
    integrator: 'gater-robot',
    appearance: 'dark',
    theme: {
      palette: {
        primary: { main: '#3b82f6' },
        background: { default: '#0f172a', paper: '#1e293b' },
      },
      container: {
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
      },
    },
    toChain: chainId,
    toToken: tokenAddress,
    toAmount: amountInWei,
    fromChain: undefined, // Let user choose source chain
    fromToken: undefined, // Let user choose source token
  }
}

/**
 * Default widget configuration for general swaps
 *
 * Used when no specific gate is selected, allows full flexibility
 * in source and destination chains/tokens.
 */
export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  integrator: 'gater-robot',
  appearance: 'dark',
  theme: {
    palette: {
      primary: { main: '#3b82f6' },
      background: { default: '#0f172a', paper: '#1e293b' },
    },
    container: {
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
    },
  },
}

/**
 * Supported chain IDs for the widget
 * Maps to chains configured in wagmi.ts
 */
export const SUPPORTED_CHAIN_IDS = {
  MAINNET: 1,
  BASE: 8453,
  ARBITRUM: 42161,
  SEPOLIA: 11155111,
} as const

/**
 * Chain name mapping for display purposes
 */
export const CHAIN_NAMES: Record<number, string> = {
  [SUPPORTED_CHAIN_IDS.MAINNET]: 'Ethereum',
  [SUPPORTED_CHAIN_IDS.BASE]: 'Base',
  [SUPPORTED_CHAIN_IDS.ARBITRUM]: 'Arbitrum',
  [SUPPORTED_CHAIN_IDS.SEPOLIA]: 'Sepolia',
}
