/**
 * Wagmi Configuration via Reown AppKit WagmiAdapter
 *
 * Uses WagmiAdapter instead of bare createConfig so that AppKit
 * can manage WalletConnect deep-linking (critical for Telegram WebView).
 */

import {
  SUPPORTED_CHAINS,
  getAlchemyHttpUrl,
  getChainKey,
  getViemChain,
} from "@gater/chain-registry"
import { http } from "wagmi"
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi"
import type { AppKitNetwork } from "@reown/appkit/networks"

export const WALLET_CONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "demo"

const configuredChains = SUPPORTED_CHAINS.map((c) => getViemChain(c.chainId)).filter(
  Boolean,
) as AppKitNetwork[]

export const enabledChains: [AppKitNetwork, ...AppKitNetwork[]] =
  configuredChains.length > 0
    ? (configuredChains as [AppKitNetwork, ...AppKitNetwork[]])
    : ([getViemChain(1)].filter(Boolean) as [AppKitNetwork, ...AppKitNetwork[]])

function getRpcUrl(chainId: number): string | undefined {
  const chainKey = getChainKey(chainId)
  if (!chainKey) return undefined
  const envKey = `VITE_${chainKey.toUpperCase()}_RPC_URL`
  const configured = (import.meta.env as Record<string, string | undefined>)[envKey]
  if (configured && configured.length > 0) return configured

  const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined
  if (alchemyKey) {
    const url = getAlchemyHttpUrl(chainId, alchemyKey)
    if (url) return url
  }

  return undefined
}

export const wagmiAdapter = new WagmiAdapter({
  networks: enabledChains,
  projectId: WALLET_CONNECT_PROJECT_ID,
  transports: Object.fromEntries(
    enabledChains.map((chain) => [
      chain.id,
      http(getRpcUrl(chain.id as number)),
    ]),
  ) as any,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
