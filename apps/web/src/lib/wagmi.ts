/**
 * Wagmi Configuration for Gater Robot
 *
 * Sets up wallet connection and chain configuration.
 * Includes mainnet for ENS resolution + L2 chains for token gating.
 */

import { createConfig, http } from 'wagmi'
import { mainnet, base, arbitrum, sepolia } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'
import { arcTestnet } from './chains'

// WalletConnect project ID (for production, use env variable)
const WALLET_CONNECT_PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'demo'

export const wagmiConfig = createConfig({
  chains: [mainnet, base, arbitrum, sepolia, arcTestnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLET_CONNECT_PROJECT_ID,
      metadata: {
        name: 'Gater Robot',
        description: 'Token-gated Telegram groups with ENS identity',
        url: 'https://gater.robot',
        icons: ['https://gater.robot/icon.png'],
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [arbitrum.id]: http(),
    [sepolia.id]: http(),
    [arcTestnet.id]: http(import.meta.env.VITE_ARC_TESTNET_RPC_URL),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
