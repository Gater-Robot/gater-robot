/**
 * Network Utilities
 *
 * Helper functions for working with blockchain networks.
 */

import * as chains from 'viem/chains'
import { supportedChains, type ChainWithIcon } from '@/config/chains'

/**
 * Get block explorer transaction URL
 *
 * @param chainId - Chain ID
 * @param txHash - Transaction hash
 * @returns Block explorer URL or empty string if not available
 */
export function getBlockExplorerTxLink(chainId: number, txHash: string): string {
  const chain = supportedChains.find((c) => c.id === chainId)
  const explorerUrl = chain?.blockExplorers?.default?.url

  if (!explorerUrl) {
    console.warn(`[networks] getBlockExplorerTxLink: No block explorer configured for chainId ${chainId}`)
    return ''
  }

  return `${explorerUrl}/tx/${txHash}`
}

/**
 * Get block explorer address URL
 *
 * @param chainId - Chain ID or chain object
 * @param address - Wallet or contract address
 * @returns Block explorer URL
 */
export function getBlockExplorerAddressLink(
  chainOrId: number | ChainWithIcon,
  address: string
): string {
  const chain =
    typeof chainOrId === 'number'
      ? supportedChains.find((c) => c.id === chainOrId)
      : chainOrId

  const explorerUrl = chain?.blockExplorers?.default?.url

  if (!explorerUrl) {
    const chainId = typeof chainOrId === 'number' ? chainOrId : chainOrId?.id
    console.warn(`[networks] getBlockExplorerAddressLink: No block explorer for chainId ${chainId}, falling back to Etherscan`)
    return `https://etherscan.io/address/${address}`
  }

  return `${explorerUrl}/address/${address}`
}

/**
 * Get block explorer name for a chain
 */
export function getBlockExplorerName(chainId: number): string {
  const chain = supportedChains.find((c) => c.id === chainId)
  return chain?.blockExplorers?.default?.name ?? 'Explorer'
}

/**
 * Check if a chain ID is supported
 */
export function isChainSupported(chainId: number): boolean {
  return supportedChains.some((c) => c.id === chainId)
}

/**
 * Get all target networks with extra metadata
 */
export function getTargetNetworks(): ChainWithIcon[] {
  return [...supportedChains]
}

/**
 * Native currency token addresses on Ethereum mainnet
 * Used for fetching USD prices of non-ETH native currencies
 */
export const NATIVE_CURRENCY_TOKEN_ADDRESSES: Record<number, string> = {
  [chains.polygon.id]: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', // MATIC
  [chains.bsc.id]: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', // BNB
  [chains.opBNB.id]: '0xB8c77482e45F1F44dE1745F52C74426C631bDD52', // BNB
  [chains.avalanche.id]: '0x85f138bfEE4ef8e540890CFb48F620571d67Eda3', // WAVAX
  [chains.mantle.id]: '0x3c3a81e81dc49a522a592e7622a7e711c06bf354', // MNT
  [chains.celo.id]: '0xe452e6EA2dDeB012e20dB73bf5d3863A3Ac8d77a', // wCELO
}

/**
 * Format chain ID for display
 */
export function formatChainId(chainId: number): string {
  return chainId.toString()
}

/**
 * Get the default chain (mainnet)
 */
export function getDefaultChain(): ChainWithIcon {
  return supportedChains[0]
}
