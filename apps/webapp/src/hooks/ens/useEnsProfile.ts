import { useEnsAvatar, useEnsName, useEnsText } from "wagmi"
import { mainnet } from "wagmi/chains"

import { ENS_TEXT_RECORD_KEYS } from "@/lib/ens/config"

export interface EnsProfile {
  name: string | null
  avatar: string | null
  telegram: string | null
  twitter: string | null
  github: string | null
  discord: string | null
  url: string | null
  description: string | null
  email: string | null
  isLoading: boolean
  error: Error | null
}

export function useEnsProfile(address: `0x${string}` | undefined): EnsProfile {
  const chainId = mainnet.id

  const { data: name, isLoading: nameLoading, error: nameError } = useEnsName({
    address,
    chainId,
  })

  const { data: avatar, isLoading: avatarLoading } = useEnsAvatar({
    name: name ?? undefined,
    chainId,
  })

  const enabled = !!name

  const { data: telegram, isLoading: telegramLoading } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.telegram,
    chainId,
    query: { enabled },
  })

  const { data: twitter, isLoading: twitterLoading } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.twitter,
    chainId,
    query: { enabled },
  })

  const { data: github, isLoading: githubLoading } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.github,
    chainId,
    query: { enabled },
  })

  const { data: discord, isLoading: discordLoading } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.discord,
    chainId,
    query: { enabled },
  })

  const { data: url, isLoading: urlLoading } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.url,
    chainId,
    query: { enabled },
  })

  const { data: description, isLoading: descriptionLoading } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.description,
    chainId,
    query: { enabled },
  })

  const { data: email, isLoading: emailLoading } = useEnsText({
    name: name ?? undefined,
    key: ENS_TEXT_RECORD_KEYS.email,
    chainId,
    query: { enabled },
  })

  const textRecordsLoading =
    telegramLoading ||
    twitterLoading ||
    githubLoading ||
    discordLoading ||
    urlLoading ||
    descriptionLoading ||
    emailLoading

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
    isLoading: nameLoading || avatarLoading || textRecordsLoading,
    error: (nameError as Error | null) ?? null,
  }
}

export function useEnsNameOnly(address: `0x${string}` | undefined) {
  const { data, isLoading, error } = useEnsName({
    address,
    chainId: mainnet.id,
  })

  return {
    name: data ?? null,
    isLoading,
    error: (error as Error | null) ?? null,
  }
}

