/**
 * Cross-Chain ENS Resolution Utilities
 *
 * ENS lives on Ethereum mainnet, but we can resolve ENS names
 * while connected to any chain (Base, Arbitrum, etc.)
 *
 * These utilities provide direct viem-based resolution that works
 * regardless of the user's currently connected chain.
 */

import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

// Mainnet client for ENS resolution (always needed)
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
})

/**
 * Resolve ENS name for an address (reverse lookup)
 * Works regardless of which chain the user is connected to.
 */
export async function resolveEnsName(
  address: `0x${string}`
): Promise<string | null> {
  try {
    return await mainnetClient.getEnsName({ address })
  } catch (error) {
    console.error('ENS name resolution failed:', error)
    return null
  }
}

/**
 * Resolve address for an ENS name (forward lookup)
 * Normalizes the name according to ENS standards.
 */
export async function resolveEnsAddress(
  name: string
): Promise<`0x${string}` | null> {
  try {
    return await mainnetClient.getEnsAddress({ name: normalize(name) })
  } catch (error) {
    console.error('ENS address resolution failed:', error)
    return null
  }
}

/**
 * Resolve ENS avatar
 * Handles all avatar URI schemes (http, ipfs, eip155 NFTs)
 */
export async function resolveEnsAvatar(name: string): Promise<string | null> {
  try {
    return await mainnetClient.getEnsAvatar({ name: normalize(name) })
  } catch (error) {
    console.error('ENS avatar resolution failed:', error)
    return null
  }
}

/**
 * Resolve a single ENS text record
 */
export async function resolveEnsText(
  name: string,
  key: string
): Promise<string | null> {
  try {
    return await mainnetClient.getEnsText({ name: normalize(name), key })
  } catch (error) {
    console.error(`ENS text record (${key}) resolution failed:`, error)
    return null
  }
}

/**
 * Batch resolve multiple text records for an ENS name
 * More efficient than individual calls for profile display.
 */
export async function resolveEnsProfile(name: string) {
  const normalizedName = normalize(name)

  const [avatar, telegram, twitter, github, url, description, discord, email] =
    await Promise.all([
      mainnetClient.getEnsAvatar({ name: normalizedName }).catch(() => null),
      mainnetClient
        .getEnsText({ name: normalizedName, key: 'org.telegram' })
        .catch(() => null),
      mainnetClient
        .getEnsText({ name: normalizedName, key: 'com.twitter' })
        .catch(() => null),
      mainnetClient
        .getEnsText({ name: normalizedName, key: 'com.github' })
        .catch(() => null),
      mainnetClient
        .getEnsText({ name: normalizedName, key: 'url' })
        .catch(() => null),
      mainnetClient
        .getEnsText({ name: normalizedName, key: 'description' })
        .catch(() => null),
      mainnetClient
        .getEnsText({ name: normalizedName, key: 'com.discord' })
        .catch(() => null),
      mainnetClient
        .getEnsText({ name: normalizedName, key: 'email' })
        .catch(() => null),
    ])

  return {
    avatar,
    telegram,
    twitter,
    github,
    url,
    description,
    discord,
    email,
  }
}

/**
 * Check if an address has an ENS name
 */
export async function hasEnsName(address: `0x${string}`): Promise<boolean> {
  const name = await resolveEnsName(address)
  return name !== null
}
