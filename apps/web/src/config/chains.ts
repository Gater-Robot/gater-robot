/**
 * Chain Configuration for Gater Robot Web3
 *
 * Defines 25 supported chains with icons for RainbowKit.
 * Excludes Shibarium and Puppynet per hackathon requirements.
 */

import { defineChain, type Chain } from 'viem'
import * as chains from 'viem/chains'

/**
 * Chain with icon URL for RainbowKit
 */
export type ChainWithIcon = Chain & {
  iconUrl?: string
}

/**
 * Helper to create chain with icon
 */
export function defineChainWithIcon(chain: ChainWithIcon): ChainWithIcon {
  return defineChain(chain)
}

/**
 * Custom chain: HyperEVM (Hyperliquid)
 * Not available in viem/chains
 */
export const hyperEvm = defineChainWithIcon({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: {
    decimals: 18,
    name: 'Hyperliquid',
    symbol: 'HYPE',
  },
  rpcUrls: {
    default: {
      http: ['https://hyperliquid.drpc.org', 'https://rpc.hyperliquid.xyz/evm'],
      webSocket: ['wss://hyperliquid.drpc.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HyperEVM Explorer',
      url: 'https://explorer.hyperliquid.xyz',
    },
  },
  iconUrl: '/chain_logo/999.png',
})

/**
 * Custom chain: Monad
 * Not available in viem/chains
 */
export const monad = defineChainWithIcon({
  id: 143,
  name: 'Monad',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz', 'https://monad-mainnet.drpc.org'],
      webSocket: ['wss://rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monadscan',
      url: 'https://monadscan.io',
    },
  },
  iconUrl: '/chain_logo/143.png',
})

/**
 * Add icon URL to a standard viem chain
 */
function withIcon<T extends Chain>(chain: T): ChainWithIcon {
  return {
    ...chain,
    iconUrl: `/chain_logo/${chain.id}.png`,
  }
}

/**
 * All supported chains with icons
 * 25 chains total (excluding Shibarium and Puppynet)
 */
export const supportedChains = [
  // Mainnets
  withIcon(chains.mainnet),        // 1
  withIcon(chains.optimism),       // 10
  withIcon(chains.bsc),            // 56
  withIcon(chains.unichain),       // 130
  withIcon(chains.polygon),        // 137
  monad,                           // 143 (custom)
  withIcon(chains.sonic),          // 146
  withIcon(chains.opBNB),          // 204
  withIcon(chains.lens),           // 232
  withIcon(chains.zksync),         // 324
  withIcon(chains.worldchain),     // 480
  hyperEvm,                        // 999 (custom)
  withIcon(chains.mantle),         // 5000
  withIcon(chains.base),           // 8453
  withIcon(chains.katana),         // 9745
  withIcon(chains.arbitrum),       // 42161
  withIcon(chains.celo),           // 42220
  withIcon(chains.avalanche),      // 43114
  withIcon(chains.ink),            // 57073
  withIcon(chains.linea),          // 59144
  withIcon(chains.berachain),      // 80094
  withIcon(chains.scroll),         // 534352
  withIcon(chains.plasma),         // 747474 (Flow)
  withIcon(chains.aurora),         // 1313161554
  // Testnets
  withIcon(chains.baseSepolia),    // 84532
  withIcon(chains.sepolia),        // 11155111
] as const

/**
 * Type for supported chain IDs
 */
export type SupportedChainId = (typeof supportedChains)[number]['id']

/**
 * Get chain by ID
 */
export function getChainById(chainId: number): ChainWithIcon | undefined {
  return supportedChains.find(chain => chain.id === chainId)
}

/**
 * Default chain for the app
 */
export const defaultChain = chains.mainnet

/**
 * Network colors for UI theming
 * [lightThemeColor, darkThemeColor] or single color string
 */
export const NETWORK_COLORS: Record<number, string | [string, string]> = {
  [chains.mainnet.id]: '#ff8b9e',
  [chains.optimism.id]: '#f01a37',
  [chains.bsc.id]: '#f0b90b',
  [chains.unichain.id]: '#ff007a',
  [chains.polygon.id]: '#800080',
  [monad.id]: '#6e54ff',
  [chains.sonic.id]: '#00aeef',
  [chains.opBNB.id]: '#f0b90b',
  [chains.lens.id]: '#00e6a7',
  [chains.zksync.id]: '#8c8dfc',
  [chains.worldchain.id]: '#1e8cff',
  [hyperEvm.id]: '#97fce4',
  [chains.mantle.id]: '#00c2a0',
  [chains.base.id]: '#0052ff',
  [chains.katana.id]: '#ffd700',
  [chains.arbitrum.id]: '#28a0f0',
  [chains.celo.id]: '#FCFF52',
  [chains.avalanche.id]: '#ff394a',
  [chains.ink.id]: '#7132f5',
  [chains.linea.id]: '#fff068',
  [chains.berachain.id]: '#814626',
  [chains.scroll.id]: '#fbebd4',
  [chains.plasma.id]: '#5b6cff',
  [chains.aurora.id]: '#78d64b',
  [chains.baseSepolia.id]: '#0052ff',
  [chains.sepolia.id]: ['#5f4bb6', '#87ff65'],
}

/**
 * Default network color fallback
 */
export const DEFAULT_NETWORK_COLOR: [string, string] = ['#666666', '#bbbbbb']

/**
 * Get network color for a chain
 */
export function getNetworkColor(chainId: number, isDarkMode: boolean): string {
  const color = NETWORK_COLORS[chainId] ?? DEFAULT_NETWORK_COLOR
  if (Array.isArray(color)) {
    return isDarkMode ? color[1] : color[0]
  }
  return color
}
