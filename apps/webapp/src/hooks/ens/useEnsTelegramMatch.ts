import { useEnsText } from "wagmi"
import { mainnet } from "wagmi/chains"

import { ENS_TEXT_RECORD_KEYS } from "@/lib/ens/config"

export interface TelegramMatchResult {
  ensName: string | null
  ensTelegram: string | null
  telegramUsername: string | null
  isMatch: boolean
  isLoading: boolean
}

export function useEnsTelegramMatch(
  ensName: string | null,
  telegramUsername: string | null,
): TelegramMatchResult {
  const { data: ensTelegram, isLoading } = useEnsText({
    name: ensName ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.telegram,
    chainId: mainnet.id,
    query: { enabled: !!ensName },
  })

  const normalizedEnsTelegram = normalizeUsername(ensTelegram)
  const normalizedTelegramUsername = normalizeUsername(telegramUsername)

  const isMatch = Boolean(
    normalizedEnsTelegram &&
      normalizedTelegramUsername &&
      normalizedEnsTelegram === normalizedTelegramUsername,
  )

  return {
    ensName,
    ensTelegram: normalizedEnsTelegram,
    telegramUsername: normalizedTelegramUsername,
    isMatch,
    isLoading,
  }
}

function normalizeUsername(username: string | null | undefined): string | null {
  if (!username) return null
  return username.toLowerCase().replace(/^@/, "").trim()
}

