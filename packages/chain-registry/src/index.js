import {
  avalanche,
  arbitrum,
  aurora,
  base,
  baseSepolia,
  berachain,
  bsc,
  celo,
  hyperEvm,
  ink,
  katana,
  lens,
  linea,
  mainnet,
  mantle,
  monad,
  opBNB,
  optimism,
  plasma,
  polygon,
  scroll,
  sepolia,
  sonic,
  unichain,
  worldchain,
  zksync,
} from "viem/chains"

const CHAIN_BY_KEY = {
  mainnet,
  base,
  arbitrum,
  polygon,
  bsc,
  optimism,
  berachain,
  hyperEvm,
  ink,
  katana,
  lens,
  linea,
  monad,
  opBNB,
  plasma,
  sonic,
  unichain,
  zksync,
  scroll,
  avalanche,
  mantle,
  worldchain,
  aurora,
  celo,
  sepolia,
  baseSepolia,
}

const asSupportedChain = (chainKey) => {
  const chain = CHAIN_BY_KEY[chainKey]
  return {
    chainKey,
    chainId: chain.id,
    label: chain.name,
    testnet: Boolean(chain.testnet),
    iconPath: `/chain_logo/${chain.id}.png`,
  }
}

export const SUPPORTED_CHAINS = [
  asSupportedChain("mainnet"),
  asSupportedChain("base"),
  asSupportedChain("arbitrum"),
  asSupportedChain("polygon"),
  asSupportedChain("bsc"),
  asSupportedChain("optimism"),
  asSupportedChain("berachain"),
  asSupportedChain("hyperEvm"),
  asSupportedChain("ink"),
  asSupportedChain("katana"),
  asSupportedChain("lens"),
  asSupportedChain("linea"),
  asSupportedChain("monad"),
  asSupportedChain("opBNB"),
  asSupportedChain("plasma"),
  asSupportedChain("sonic"),
  asSupportedChain("unichain"),
  asSupportedChain("zksync"),
  asSupportedChain("scroll"),
  asSupportedChain("avalanche"),
  asSupportedChain("mantle"),
  asSupportedChain("worldchain"),
  asSupportedChain("aurora"),
  asSupportedChain("celo"),
  asSupportedChain("sepolia"),
  asSupportedChain("baseSepolia"),
]

const SUPPORTED_CHAIN_BY_ID = new Map(SUPPORTED_CHAINS.map((c) => [c.chainId, c]))

export function isSupportedChainId(chainId) {
  return SUPPORTED_CHAIN_BY_ID.has(chainId)
}

export function getSupportedChain(chainId) {
  return SUPPORTED_CHAIN_BY_ID.get(chainId)
}

export function getChainKey(chainId) {
  return SUPPORTED_CHAIN_BY_ID.get(chainId)?.chainKey
}

export function getChainLabel(chainId) {
  return SUPPORTED_CHAIN_BY_ID.get(chainId)?.label ?? `Chain ${chainId}`
}

export function getChainIconPath(chainId) {
  return SUPPORTED_CHAIN_BY_ID.get(chainId)?.iconPath ?? `/chain_logo/${chainId}.png`
}

export function getViemChain(chainId) {
  const chainKey = SUPPORTED_CHAIN_BY_ID.get(chainId)?.chainKey
  if (!chainKey) return undefined
  return CHAIN_BY_KEY[chainKey]
}

export function getDefaultRpcUrl(chainId) {
  const chain = getViemChain(chainId)
  return chain?.rpcUrls?.default?.http?.[0]
}

// Mapping of chainId to Alchemy RPC "chain name" (used in URLs).
// Note: Not every chain is necessarily supported by Alchemy in every plan/region.
export const ALCHEMY_RPC_CHAIN_NAMES = {
  [CHAIN_BY_KEY.mainnet.id]: "eth-mainnet",
  [CHAIN_BY_KEY.base.id]: "base-mainnet",
  [CHAIN_BY_KEY.arbitrum.id]: "arb-mainnet",
  [CHAIN_BY_KEY.polygon.id]: "polygon-mainnet",
  [CHAIN_BY_KEY.bsc.id]: "bnb-mainnet",
  [CHAIN_BY_KEY.optimism.id]: "opt-mainnet",
  [CHAIN_BY_KEY.berachain.id]: "berachain-mainnet",
  [CHAIN_BY_KEY.hyperEvm.id]: "hyperliquid-mainnet",
  [CHAIN_BY_KEY.ink.id]: "ink-mainnet",
  [CHAIN_BY_KEY.katana.id]: "katana-mainnet",
  [CHAIN_BY_KEY.lens.id]: "lens-mainnet",
  [CHAIN_BY_KEY.linea.id]: "linea-mainnet",
  [CHAIN_BY_KEY.monad.id]: "monad-mainnet",
  [CHAIN_BY_KEY.opBNB.id]: "opbnb-mainnet",
  [CHAIN_BY_KEY.plasma.id]: "plasma-mainnet",
  [CHAIN_BY_KEY.sonic.id]: "sonic-mainnet",
  [CHAIN_BY_KEY.unichain.id]: "unichain-mainnet",
  [CHAIN_BY_KEY.zksync.id]: "zksync-mainnet",
  [CHAIN_BY_KEY.scroll.id]: "scroll-mainnet",
  [CHAIN_BY_KEY.avalanche.id]: "avax-mainnet",
  [CHAIN_BY_KEY.mantle.id]: "mantle-mainnet",
  [CHAIN_BY_KEY.worldchain.id]: "worldchain-mainnet",
  [CHAIN_BY_KEY.celo.id]: "celo-mainnet",
  [CHAIN_BY_KEY.baseSepolia.id]: "base-sepolia",
  [CHAIN_BY_KEY.sepolia.id]: "eth-sepolia",
}

export function getAlchemyHttpUrl(chainId, apiKey) {
  if (!apiKey) return undefined
  const chainName = ALCHEMY_RPC_CHAIN_NAMES[chainId]
  if (!chainName) return undefined
  return `https://${chainName}.g.alchemy.com/v2/${apiKey}`
}

export function getExplorerTxUrl(chainId, hash) {
  const chain = getViemChain(chainId)
  const baseUrl = chain?.blockExplorers?.default?.url
  if (!baseUrl) return ""
  return `${baseUrl}/tx/${hash.toString()}`
}

export function getExplorerAddressUrl(chainId, address) {
  const chain = getViemChain(chainId)
  const baseUrl = chain?.blockExplorers?.default?.url
  if (!baseUrl) return `https://etherscan.io/address/${address.toString()}`
  return `${baseUrl}/address/${address.toString()}`
}
