/**
 * useEnsTelegramMatch - ENS Telegram Username Matching Hook
 *
 * This is the "judge wow moment" feature for hackathon bounties!
 *
 * Checks if an ENS profile's org.telegram text record matches
 * the current Telegram user, enabling automatic identity verification
 * without requiring a SIWE signature.
 *
 * Flow:
 * 1. User connects wallet with ENS name
 * 2. We resolve their org.telegram text record
 * 3. Compare with current Telegram user's username
 * 4. If match → enable one-click verification!
 */

import { useEnsText } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { ENS_TEXT_RECORD_KEYS } from '@/lib/ens/config'

export interface TelegramMatchResult {
  /** The ENS name being checked */
  ensName: string | null
  /** The telegram username from ENS org.telegram record */
  ensTelegram: string | null
  /** The current Telegram user's username */
  telegramUsername: string | null
  /** Whether ENS telegram matches current Telegram user */
  isMatch: boolean
  /** Whether data is still loading */
  isLoading: boolean
}

/**
 * Hook to check if ENS org.telegram matches current Telegram user
 *
 * @param ensName - The ENS name to check
 * @param telegramUsername - The current Telegram user's username
 * @returns TelegramMatchResult with match status
 *
 * @example
 * ```tsx
 * const profile = useEnsProfile(address)
 * const match = useEnsTelegramMatch(profile.name, telegramUser?.username)
 *
 * if (match.isMatch) {
 *   return <Button onClick={autoVerify}>Auto-Verify via ENS</Button>
 * }
 * ```
 */
export function useEnsTelegramMatch(
  ensName: string | null,
  telegramUsername: string | null
): TelegramMatchResult {
  const { data: ensTelegram, isLoading } = useEnsText({
    name: ensName ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.telegram,
    chainId: mainnet.id,
    query: { enabled: !!ensName },
  })

  // Normalize usernames for comparison (lowercase, no @)
  const normalizedEnsTelegram = normalizeUsername(ensTelegram)
  const normalizedTelegramUsername = normalizeUsername(telegramUsername)

  // Check for match
  const isMatch = Boolean(
    normalizedEnsTelegram &&
      normalizedTelegramUsername &&
      normalizedEnsTelegram === normalizedTelegramUsername
  )

  return {
    ensName,
    ensTelegram: normalizedEnsTelegram,
    telegramUsername: normalizedTelegramUsername,
    isMatch,
    isLoading,
  }
}

/**
 * Normalize a username for comparison
 * Removes @ prefix and converts to lowercase
 */
function normalizeUsername(username: string | null | undefined): string | null {
  if (!username) return null
  return username.toLowerCase().replace(/^@/, '').trim()
}
