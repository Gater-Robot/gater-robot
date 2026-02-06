import { useEffect, useRef } from "react"
import { useMutation } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

export function useTelegramAutoRegister() {
  const { user, initDataRaw, isInitialized, isLoading } = useTelegram()
  const upsertUser = useMutation(api.users.upsertUserFromTelegram)
  const didRunRef = useRef(false)

  useEffect(() => {
    if (didRunRef.current) return
    if (!isInitialized || isLoading) return
    if (!user || !initDataRaw) return

    didRunRef.current = true

    void upsertUser({
      initDataRaw,
      telegramUsername: user.username,
      telegramFirstName: user.firstName,
      telegramLastName: user.lastName,
    }).catch((err) => {
      console.error("[gater] Failed to auto-register Telegram user:", err)
      didRunRef.current = false
    })
  }, [isInitialized, isLoading, user, initDataRaw, upsertUser])
}
