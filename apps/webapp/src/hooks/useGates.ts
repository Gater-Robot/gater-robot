import * as React from "react"
import { useAction, useMutation, useQuery } from "convex/react"

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

function isMockInitData(initDataRaw: string) {
  return new URLSearchParams(initDataRaw).get("hash") === "mock"
}

export function useGatesForOrg(orgId: string | null) {
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()

  const gates = useQuery(
    api.gates.listGatesForOrg,
    initDataRaw && orgId ? { initDataRaw, orgId: orgId as any } : "skip",
  ) as GateDoc[] | undefined

  return {
    gates: gates ?? [],
    isLoading: telegram.isLoading || (orgId != null && gates === undefined),
  }
}

export function useGatesForChannel(channelId: string | null) {
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()

  const gates = useQuery(
    api.gates.listGatesForChannel,
    initDataRaw && channelId ? { initDataRaw, channelId: channelId as any } : "skip",
  ) as GateDoc[] | undefined

  const createGateMutation = useMutation(api.gates.createGate)
  const createGateSecureAction = useAction(api.adminActions.createGateSecure)

  const setGateActiveMutation = useMutation(api.gates.setGateActive)
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

      const shouldUseInsecure =
        import.meta.env.DEV && isMockInitData(currentInitData)

      if (shouldUseInsecure) {
        return await createGateMutation({
          initDataRaw: currentInitData,
          orgId: args.orgId as any,
          channelId: args.channelId as any,
          chainId: args.chainId,
          tokenAddress: args.tokenAddress,
          tokenSymbol: args.tokenSymbol,
          tokenName: args.tokenName,
          tokenDecimals: args.tokenDecimals,
          threshold: args.threshold,
        })
      }

      try {
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
      } catch (error) {
        if (import.meta.env.DEV) {
          return await createGateMutation({
            initDataRaw: currentInitData,
            orgId: args.orgId as any,
            channelId: args.channelId as any,
            chainId: args.chainId,
            tokenAddress: args.tokenAddress,
            tokenSymbol: args.tokenSymbol,
            tokenName: args.tokenName,
            tokenDecimals: args.tokenDecimals,
            threshold: args.threshold,
          })
        }
        throw error
      }
    },
    [createGateMutation, createGateSecureAction, telegram],
  )

  const setGateActive = React.useCallback(
    async (args: { gateId: string; active: boolean }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      const shouldUseInsecure =
        import.meta.env.DEV && isMockInitData(currentInitData)

      if (shouldUseInsecure) {
        await setGateActiveMutation({
          initDataRaw: currentInitData,
          gateId: args.gateId as any,
          active: args.active,
        })
        return
      }

      try {
        await setGateActiveSecureAction({
          initDataRaw: currentInitData,
          gateId: args.gateId as any,
          active: args.active,
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          await setGateActiveMutation({
            initDataRaw: currentInitData,
            gateId: args.gateId as any,
            active: args.active,
          })
          return
        }
        throw error
      }
    },
    [setGateActiveMutation, setGateActiveSecureAction, telegram],
  )

  return {
    gates: gates ?? [],
    isLoading: telegram.isLoading || (channelId != null && gates === undefined),
    createGate,
    setGateActive,
  }
}

