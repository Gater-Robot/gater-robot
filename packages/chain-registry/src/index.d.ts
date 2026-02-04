export type SupportedChainKey =
  | "mainnet"
  | "base"
  | "arbitrum"
  | "polygon"
  | "bsc"
  | "optimism"
  | "berachain"
  | "hyperEvm"
  | "ink"
  | "katana"
  | "lens"
  | "linea"
  | "monad"
  | "opBNB"
  | "plasma"
  | "sonic"
  | "unichain"
  | "zksync"
  | "scroll"
  | "avalanche"
  | "mantle"
  | "worldchain"
  | "aurora"
  | "celo"
  | "shibarium"
  | "sepolia"
  | "baseSepolia"

export type SupportedChain = {
  chainKey: SupportedChainKey
  chainId: number
  label: string
  testnet: boolean
  iconPath: string
}

export const SUPPORTED_CHAINS: readonly SupportedChain[]

export function isSupportedChainId(chainId: number): boolean
export function getSupportedChain(chainId: number): SupportedChain | undefined
export function getChainKey(chainId: number): SupportedChainKey | undefined
export function getChainLabel(chainId: number): string
export function getChainIconPath(chainId: number): string
export function getViemChain(chainId: number): any | undefined
export function getDefaultRpcUrl(chainId: number): string | undefined
export const ALCHEMY_RPC_CHAIN_NAMES: Record<number, string>
export function getAlchemyHttpUrl(chainId: number, apiKey: string): string | undefined
export function getExplorerTxUrl(chainId: number, hash: string): string
export function getExplorerAddressUrl(chainId: number, address: string): string
