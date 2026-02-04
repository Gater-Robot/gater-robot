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
  shibarium,
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
  shibarium,
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
  asSupportedChain("shibarium"),
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

