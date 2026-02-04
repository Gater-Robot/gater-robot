import { getChainKey, getDefaultRpcUrl, getViemChain } from "@gater/chain-registry"
import { createPublicClient, http, type PublicClient } from "viem"

const clientCache = new Map<number, PublicClient>()

function getRpcUrl(chainId: number): string | undefined {
  const chainKey = getChainKey(chainId)
  if (chainKey) {
    const envKey = `VITE_${chainKey.toUpperCase()}_RPC_URL`
    const configured = (import.meta.env as Record<string, string | undefined>)[envKey]
    if (configured && configured.length > 0) return configured
  }

  return getDefaultRpcUrl(chainId)
}

export function getPublicClient(chainId: number): PublicClient {
  const cached = clientCache.get(chainId)
  if (cached) return cached

  const chain = getViemChain(chainId)
  const rpcUrl = getRpcUrl(chainId)
  if (!chain || !rpcUrl) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl, { timeout: 10_000, retryCount: 1 }),
  }) as unknown as PublicClient

  clientCache.set(chainId, client)
  return client
}
