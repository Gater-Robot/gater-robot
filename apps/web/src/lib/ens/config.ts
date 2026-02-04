/**
 * ENS Configuration for Gater Robot
 *
 * ENS (Ethereum Name Service) resolution configuration.
 * ENS primarily lives on Ethereum mainnet, but can be resolved from L2 contexts.
 */

import { mainnet, base, arbitrum, sepolia } from 'wagmi/chains'
import { arcTestnet } from '../chains'

// Chains that support ENS resolution
export const ENS_SUPPORTED_CHAINS = [mainnet, base, arbitrum, sepolia, arcTestnet] as const

// For cross-chain resolution, always query mainnet for ENS
export const ENS_RESOLUTION_CHAIN_ID = mainnet.id

// Sepolia for testing (has ENS testnet deployment)
export const ENS_TESTNET_CHAIN_ID = sepolia.id

/**
 * ENS Text Record Keys
 *
 * Standard text record keys used by ENS profiles.
 * See: https://docs.ens.domains/ens-improvement-proposals/ensip-5-text-records
 */
export const ENS_TEXT_RECORD_KEYS = {
  // Social profiles
  telegram: 'org.telegram',
  twitter: 'com.twitter',
  github: 'com.github',
  discord: 'com.discord',

  // Identity
  avatar: 'avatar',
  description: 'description',
  email: 'email',
  url: 'url',

  // Additional records
  keywords: 'keywords',
  notice: 'notice',
} as const

export type EnsTextRecordKey = keyof typeof ENS_TEXT_RECORD_KEYS

/**
 * Well-known ENS addresses for testing
 */
export const KNOWN_ENS_ADDRESSES = {
  vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as const,
  nick: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5' as const,
  ens: '0xFe89cc7aBB2C4183683ab71653C4cdc9B02D44b7' as const,
} as const

/**
 * ENS avatar URI schemes supported by ENSIP-12
 */
export const ENS_AVATAR_SCHEMES = [
  'http://',
  'https://',
  'ipfs://',
  'eip155:', // NFT references
] as const
