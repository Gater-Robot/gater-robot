/**
 * Wagmi Configuration
 */

import { SUPPORTED_CHAINS, getChainKey, getViemChain } from "@gater/chain-registry"
import { createConfig, http } from "wagmi"
import { injected, walletConnect } from "wagmi/connectors"

const WALLET_CONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "demo"

const configuredChains = SUPPORTED_CHAINS.map((c) => getViemChain(c.chainId)).filter(
  Boolean,
)

export const enabledChains = (configuredChains.length
  ? configuredChains
  : [getViemChain(1)].filter(Boolean)) as unknown as readonly [
  any,
  ...any[],
]

function getRpcUrl(chainId: number): string | undefined {
  const chainKey = getChainKey(chainId)
  if (!chainKey) return undefined
  const envKey = `VITE_${chainKey.toUpperCase()}_RPC_URL`
  return (import.meta.env as Record<string, string | undefined>)[envKey]
}

export const wagmiConfig = createConfig({
  chains: enabledChains as any,
  connectors: [
    injected(),
    walletConnect({
      projectId: WALLET_CONNECT_PROJECT_ID,
      metadata: {
        name: "Gater Robot",
        description: "Token-gated Telegram groups with ENS identity",
        url: "https://gater-app.agentix.bot",
        icons: ["https://gater-app.agentix.bot/icon.png"],
      },
    }),
  ],
  transports: Object.fromEntries(
    enabledChains.map((chain: any) => [
      chain.id,
      http(getRpcUrl(chain.id)),
    ]),
  ) as any,
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}

