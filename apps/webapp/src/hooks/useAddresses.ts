import { useCallback, useState } from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

type Id<TableName extends string> = string & { __tableName?: TableName }

export interface UserAddress {
  _id: Id<"addresses">
  _creationTime: number
  userId: Id<"users">
  address: string
  status: "pending" | "verified"
  verifiedAt?: number
  verificationMethod?: "siwe" | "ens_telegram_match"
  siweNonce?: string | null
  siweMessage?: string
  siweSignature?: string
  ensName?: string
  ensAvatar?: string
  ensTelegram?: string
  ensTwitter?: string
  ensGithub?: string
  ensUrl?: string
  ensDescription?: string
  ensUpdatedAt?: number
  createdAt: number
  updatedAt: number
  isDefault: boolean
}

export function useAddresses() {
  const { initDataRaw, isLoading: telegramLoading } = useTelegram()
  const [setDefaultError, setSetDefaultError] = useState<Error | null>(null)
  const [isSettingDefault, setIsSettingDefault] = useState(false)

  const addresses = useQuery(
    api.ens.getUserAddresses,
    initDataRaw ? { initDataRaw } : "skip",
  )

  const setDefaultMutation = useMutation(api.ens.setDefaultAddress)

  const setDefault = useCallback(
    async (addressId: Id<"addresses">) => {
      if (!initDataRaw) {
        setSetDefaultError(new Error("Not authenticated"))
        return
      }

      setIsSettingDefault(true)
      setSetDefaultError(null)
      try {
        await setDefaultMutation({ addressId, initDataRaw })
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("Failed to set default address")
        setSetDefaultError(error)
        throw error
      } finally {
        setIsSettingDefault(false)
      }
    },
    [initDataRaw, setDefaultMutation],
  )

  const isLoading = telegramLoading || addresses === undefined

  return {
    addresses: addresses ?? [],
    isLoading,
    error: null as Error | null,
    setDefault,
    isSettingDefault,
    setDefaultError,
  }
}
