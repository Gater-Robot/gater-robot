import { useAction } from "convex/react"
import { useCallback, useState } from "react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

type Id<TableName extends string> = string & { __tableName?: TableName }

export interface EligibilityResult {
  hasUser: boolean
  hasVerifiedWallet: boolean
  hasActiveGate: boolean
  isEligible: boolean
  membershipStatus: string | null
  balance: string
  formattedBalance: string
  threshold: string
  formattedThreshold: string
  tokenSymbol: string
  chainName: string
  tokenAddress: string
  chainId: number
  decimals: number
  channelTitle: string
}

export function useCheckEligibility() {
  const { user, isLoading: telegramLoading } = useTelegram()
  const [result, setResult] = useState<EligibilityResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const checkEligibilityAction = useAction(
    api.eligibility.getChannelEligibilityStatus,
  )

  const reset = useCallback(() => {
    setResult(null)
    setIsChecking(false)
    setError(null)
  }, [])

  const check = useCallback(
    async (channelId: Id<"channels">) => {
      if (telegramLoading) {
        setError(new Error("Telegram SDK is still loading"))
        return
      }
      if (!user) {
        setError(new Error("Not authenticated with Telegram"))
        return
      }

      setIsChecking(true)
      setError(null)
      try {
        const eligibilityResult = await checkEligibilityAction({
          telegramUserId: user.id.toString(),
          channelId,
        })
        setResult(eligibilityResult)
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error("Failed to check eligibility")
        setError(errorObj)
        setResult(null)
      } finally {
        setIsChecking(false)
      }
    },
    [checkEligibilityAction, telegramLoading, user],
  )

  return { check, result, isChecking, error, reset }
}
