/**
 * Balance fetching utilities using viem
 *
 * Provides functions to fetch ERC20 token balances and metadata
 * from various EVM chains via public RPC endpoints.
 */

import {
  SUPPORTED_CHAINS,
  getAlchemyHttpUrl,
  getChainKey,
  getChainLabel,
  getDefaultRpcUrl,
  getViemChain,
  isSupportedChainId,
} from '@gater/chain-registry'
import { createPublicClient, http, type PublicClient } from 'viem'

function getRpcUrl(chainId: number): string | undefined {
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

/**
 * Minimal ERC20 ABI for balance and decimals queries
 */
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: 'decimals', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    name: 'symbol',
    type: 'function',
    inputs: [],
    outputs: [{ name: 'symbol', type: 'string' }],
    stateMutability: 'view',
  },
  {
    name: 'name',
    type: 'function',
    inputs: [],
    outputs: [{ name: 'name', type: 'string' }],
    stateMutability: 'view',
  },
] as const

// Cache for public clients to avoid recreating them
const clientCache = new Map<number, PublicClient>()

/**
 * Get or create a public client for the specified chain
 * @param chainId - The chain ID to create a client for
 * @returns A viem PublicClient configured for the chain
 * @throws Error if the chain is not supported
 */
export function getChainClient(chainId: number): PublicClient {
  // Return cached client if available
  const cached = clientCache.get(chainId)
  if (cached) return cached

  const chain = getViemChain(chainId)
  const rpcUrl = getRpcUrl(chainId)

  if (!chain || !rpcUrl) {
    const supported = SUPPORTED_CHAINS.map((c) => c.chainId).join(', ')
    throw new Error(`Unsupported chain: ${chainId}. Supported chains: ${supported}`)
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl, {
      timeout: 10_000, // 10 second timeout
      retryCount: 2,
    }),
  }) as unknown as PublicClient

  clientCache.set(chainId, client)
  return client
}

/**
 * Result type for balance fetching operations
 */
export type BalanceResult =
  | { success: true; balance: string }
  | { success: false; error: string }

/**
 * Fetch ERC20 token balance for a wallet address
 * @param chainId - The chain ID where the token exists
 * @param tokenAddress - The ERC20 token contract address
 * @param userAddress - The wallet address to check balance for
 * @returns Result object with balance on success, or error message on failure
 */
export async function fetchTokenBalance(
  chainId: number,
  tokenAddress: string,
  userAddress: string
): Promise<BalanceResult> {
  try {
    const client = getChainClient(chainId)
    const balance = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress as `0x${string}`],
    })
    return { success: true, balance: balance.toString() }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown RPC error'
    console.error(`Failed to fetch balance on chain ${chainId} for ${userAddress}:`, error)
    return { success: false, error: errorMessage }
  }
}

/**
 * Fetch ERC20 token decimals
 * @param chainId - The chain ID where the token exists
 * @param tokenAddress - The ERC20 token contract address
 * @returns The number of decimals (defaults to 18 on error)
 */
export async function fetchTokenDecimals(
  chainId: number,
  tokenAddress: string
): Promise<number> {
  try {
    const client = getChainClient(chainId)
    const decimals = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'decimals',
      args: [],
    })
    return Number(decimals)
  } catch (error) {
    console.error(`Failed to fetch decimals for ${tokenAddress} on chain ${chainId}:`, error)
    return 18 // Default to 18 decimals
  }
}

/**
 * Fetch ERC20 token metadata (symbol, name, decimals)
 * @param chainId - The chain ID where the token exists
 * @param tokenAddress - The ERC20 token contract address
 * @returns Token metadata object
 */
export async function fetchTokenMetadata(
  chainId: number,
  tokenAddress: string
): Promise<{ symbol: string; name: string; decimals: number }> {
  try {
    const client = getChainClient(chainId)

    // Fetch all metadata in parallel
    const [symbol, name, decimals] = await Promise.all([
      client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'symbol',
        args: [],
      }).catch(() => 'UNKNOWN'),
      client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'name',
        args: [],
      }).catch(() => 'Unknown Token'),
      client.readContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'decimals',
        args: [],
      }).catch(() => 18),
    ])

    return {
      symbol: symbol as string,
      name: name as string,
      decimals: Number(decimals),
    }
  } catch (error) {
    console.error(`Failed to fetch token metadata for ${tokenAddress} on chain ${chainId}:`, error)
    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      decimals: 18,
    }
  }
}

/**
 * Check if a chain ID is supported
 * @param chainId - The chain ID to check
 * @returns True if the chain is supported
 */
export function isSupportedChain(chainId: number): boolean {
  return isSupportedChainId(chainId)
}

/**
 * Get list of supported chain IDs
 * @returns Array of supported chain IDs
 */
export function getSupportedChains(): number[] {
  return SUPPORTED_CHAINS.map((c) => c.chainId)
}

/**
 * Human-readable chain names (for legacy call-sites).
 *
 * Prefer `getChainLabel(chainId)` from `@gater/chain-registry` for new usage.
 */
export const CHAIN_NAMES: Record<number, string> = Object.fromEntries(
  SUPPORTED_CHAINS.map((c) => [c.chainId, getChainLabel(c.chainId)]),
)

/**
 * Format a raw balance to human-readable format
 * @param balance - Raw balance as string (in wei)
 * @param decimals - Token decimals
 * @returns Formatted balance string
 */
export function formatBalance(balance: string, decimals: number): string {
  const value = BigInt(balance)
  const divisor = BigInt(10 ** decimals)
  const wholePart = value / divisor
  const fractionalPart = value % divisor

  // Format fractional part with leading zeros
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')

  // Trim trailing zeros but keep at least 2 decimal places for display
  const trimmedFractional = fractionalStr.replace(/0+$/, '').slice(0, 6) || '00'

  return `${wholePart.toString()}.${trimmedFractional}`
}

/**
 * Compare two balance strings
 * @param balance - The balance to check
 * @param threshold - The threshold to compare against
 * @returns True if balance >= threshold
 */
export function meetsThreshold(balance: string, threshold: string): boolean {
  try {
    return BigInt(balance) >= BigInt(threshold)
  } catch {
    return false
  }
}
