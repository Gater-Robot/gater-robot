import { arbitrum, base, mainnet, sepolia } from "wagmi/chains"

export const ENS_SUPPORTED_CHAINS = [mainnet, base, arbitrum, sepolia] as const

export const ENS_RESOLUTION_CHAIN_ID = mainnet.id

export const ENS_TESTNET_CHAIN_ID = sepolia.id

export const ENS_TEXT_RECORD_KEYS = {
  telegram: "org.telegram",
  twitter: "com.twitter",
  github: "com.github",
  discord: "com.discord",

  avatar: "avatar",
  description: "description",
  email: "email",
  url: "url",

  keywords: "keywords",
  notice: "notice",
} as const

export type EnsTextRecordKey = keyof typeof ENS_TEXT_RECORD_KEYS

export const KNOWN_ENS_ADDRESSES = {
  vitalik: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" as const,
  nick: "0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5" as const,
  ens: "0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7" as const,
} as const

export const ENS_AVATAR_SCHEMES = [
  "http://",
  "https://",
  "ipfs://",
  "eip155:",
] as const
