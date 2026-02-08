import * as React from "react"
import { useAction, useQuery } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

export type GateDoc = {
  _id: string
  orgId: string
  channelId: string
  chainId: number
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
  tokenDecimals?: number
  threshold: string
  thresholdFormatted?: string
  active: boolean
  createdAt: number
  updatedAt: number
}

export function useGatesForOrg(orgId: string | null) {
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()
  const canQuery = Boolean(initDataRaw && orgId)

  const gates = useQuery(
    api.gates.listGatesForOrg,
    canQuery && initDataRaw && orgId ? { initDataRaw, orgId: orgId as any } : "skip",
  ) as GateDoc[] | undefined

  return {
    gates: gates ?? [],
    isLoading: telegram.isLoading || (canQuery && gates === undefined),
  }
}

export function useGatesForChannel(channelId: string | null) {
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()
  const canQuery = Boolean(initDataRaw && channelId)

  const gates = useQuery(
    api.gates.listGatesForChannel,
    canQuery && initDataRaw && channelId ? { initDataRaw, channelId: channelId as any } : "skip",
  ) as GateDoc[] | undefined

  const createGateSecureAction = useAction(api.adminActions.createGateSecure)

  const setGateActiveSecureAction = useAction(api.adminActions.setGateActiveSecure)

  const createGate = React.useCallback(
    async (args: {
      orgId: string
      channelId: string
      chainId: number
      tokenAddress: string
      tokenSymbol?: string
      tokenName?: string
      tokenDecimals?: number
      threshold: string
      thresholdFormatted?: string
    }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      return await createGateSecureAction({
        initDataRaw: currentInitData,
        orgId: args.orgId as any,
        channelId: args.channelId as any,
        chainId: args.chainId,
        tokenAddress: args.tokenAddress,
        tokenSymbol: args.tokenSymbol,
        tokenName: args.tokenName,
        tokenDecimals: args.tokenDecimals,
        threshold: args.threshold,
        thresholdFormatted: args.thresholdFormatted,
      })
    },
    [createGateSecureAction, telegram],
  )

  const setGateActive = React.useCallback(
    async (args: { gateId: string; active: boolean }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      await setGateActiveSecureAction({
        initDataRaw: currentInitData,
        gateId: args.gateId as any,
        active: args.active,
      })
    },
    [setGateActiveSecureAction, telegram],
  )

  return {
    gates: gates ?? [],
    isLoading: telegram.isLoading || (canQuery && gates === undefined),
    createGate,
    setGateActive,
  }
}
