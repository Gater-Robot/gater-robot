/**
 * Shared RPC URL resolution for Convex node actions.
 *
 * Priority: chain-specific env var → Alchemy API key → default public RPC.
 */

import {
  getAlchemyHttpUrl,
  getChainKey,
  getDefaultRpcUrl,
} from '@gater/chain-registry'

export function getRpcUrl(chainId: number): string | undefined {
  const chainKey = getChainKey(chainId)
  if (chainKey) {
    const envKey = `${chainKey.toUpperCase()}_RPC_URL`
    const configured = (process.env as Record<string, string | undefined>)[envKey]
    if (configured && configured.length > 0) return configured
  }

  const alchemyKey = process.env.ALCHEMY_API_KEY
  if (alchemyKey) {
    const url = getAlchemyHttpUrl(chainId, alchemyKey)
    if (url) return url
  }

  return getDefaultRpcUrl(chainId)
}
