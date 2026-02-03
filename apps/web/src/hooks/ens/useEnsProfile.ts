/**
 * useEnsProfile - Combined ENS Profile Resolution Hook
 *
 * Fetches all ENS data for an address in a single hook:
 * - ENS name (reverse resolution)
 * - Avatar
 * - Text records (telegram, twitter, github, url, description)
 *
 * Uses wagmi's built-in ENS hooks with mainnet resolution.
 */

import { useEnsName, useEnsAvatar, useEnsText } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { ENS_TEXT_RECORD_KEYS } from '@/lib/ens/config'

export interface EnsProfile {
  /** ENS name (e.g., "vitalik.eth") */
  name: string | null
  /** Resolved avatar URL */
  avatar: string | null
  /** org.telegram text record */
  telegram: string | null
  /** com.twitter text record */
  twitter: string | null
  /** com.github text record */
  github: string | null
  /** com.discord text record */
  discord: string | null
  /** url text record */
  url: string | null
  /** description text record */
  description: string | null
  /** email text record */
  email: string | null
  /** Whether any data is still loading */
  isLoading: boolean
  /** Error from ENS resolution */
  error: Error | null
}

/**
 * Hook to fetch complete ENS profile for an address
 *
 * @param address - The Ethereum address to resolve
 * @returns EnsProfile with all resolved data
 *
 * @example
 * ```tsx
 * const { address } = useAccount()
 * const profile = useEnsProfile(address)
 *
 * return (
 *   <div>
 *     {profile.avatar && <img src={profile.avatar} />}
 *     <span>{profile.name || truncateAddress(address)}</span>
 *   </div>
 * )
 * ```
 */
export function useEnsProfile(address: `0x${string}` | undefined): EnsProfile {
  // Always resolve ENS from mainnet
  const chainId = mainnet.id

  // Primary ENS name resolution
  const {
    data: name,
    isLoading: nameLoading,
    error: nameError,
  } = useEnsName({
    address,
    chainId,
  })

  // Avatar resolution (depends on name)
  const { data: avatar, isLoading: avatarLoading } = useEnsAvatar({
    name: name ?? undefined,
    chainId,
  })

  // Text records - only fetch if we have a name
  const enabled = !!name

  const { data: telegram } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.telegram,
    chainId,
    query: { enabled },
  })

  const { data: twitter } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.twitter,
    chainId,
    query: { enabled },
  })

  const { data: github } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.github,
    chainId,
    query: { enabled },
  })

  const { data: discord } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.discord,
    chainId,
    query: { enabled },
  })

  const { data: url } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.url,
    chainId,
    query: { enabled },
  })

  const { data: description } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.description,
    chainId,
    query: { enabled },
  })

  const { data: email } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.email,
    chainId,
    query: { enabled },
  })

  return {
    name: name ?? null,
    avatar: avatar ?? null,
    telegram: telegram ?? null,
    twitter: twitter ?? null,
    github: github ?? null,
    discord: discord ?? null,
    url: url ?? null,
    description: description ?? null,
    email: email ?? null,
    isLoading: nameLoading || avatarLoading,
    error: nameError ?? null,
  }
}

/**
 * Hook to resolve ENS name for an address
 * Simpler hook when you only need the name.
 */
export function useEnsNameOnly(address: `0x${string}` | undefined) {
  const { data, isLoading, error } = useEnsName({
    address,
    chainId: mainnet.id,
  })

  return {
    name: data ?? null,
    isLoading,
    error,
  }
}
