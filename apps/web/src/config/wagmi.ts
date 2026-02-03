/**
 * Wagmi Configuration for Gater Robot
 *
 * Configures wallet connection with RainbowKit.
 * Only supports MetaMask connector for hackathon simplicity.
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { supportedChains, type ChainWithIcon } from './chains'

// Project metadata
const PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64'
const APP_NAME = 'Gater Robot'
const APP_DESCRIPTION = 'Token-gated Telegram groups with Web3 identity'

/**
 * Create HTTP transports for all supported chains
 */
function createTransports(): Record<number, ReturnType<typeof http>> {
  const transports: Record<number, ReturnType<typeof http>> = {}
  for (const chain of supportedChains) {
    transports[chain.id] = http()
  }
  return transports
}

/**
 * Wagmi + RainbowKit configuration
 *
 * Note: getDefaultConfig creates wagmi config with RainbowKit defaults.
 * For MetaMask-only, we rely on injected connector which getDefaultConfig includes.
 */
export const wagmiConfig = getDefaultConfig({
  appName: APP_NAME,
  appDescription: APP_DESCRIPTION,
  appUrl: 'https://gater.robot',
  appIcon: '/icon.png',
  projectId: PROJECT_ID,
  chains: supportedChains as unknown as readonly [ChainWithIcon, ...ChainWithIcon[]],
  transports: createTransports(),
  ssr: false,
})

/**
 * Polling interval for blockchain data (ms)
 */
export const POLLING_INTERVAL = 30000

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
