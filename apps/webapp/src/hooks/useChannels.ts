import * as React from "react"
import { useAction, useMutation, useQuery } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

export type ChannelDoc = {
  _id: string
  orgId: string
  telegramChatId: string
  title?: string
  type: "public" | "private"
  botIsAdmin: boolean
  verifiedAt?: number
  createdAt: number
}

function isMockInitData(initDataRaw: string) {
  return new URLSearchParams(initDataRaw).get("hash") === "mock"
}

export function useChannels(orgId: string | null) {
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()

  const channels = useQuery(
    api.channels.listChannelsForOrg,
    initDataRaw && orgId ? { initDataRaw, orgId: orgId as any } : "skip",
  ) as ChannelDoc[] | undefined

  const createChannelMutation = useMutation(api.channels.createChannel)
  const createChannelSecureAction = useAction(api.adminActions.createChannelSecure)

  const setBotAdminMutation = useMutation(api.channels.setChannelBotAdminStatus)
  const setBotAdminSecureAction = useAction(api.adminActions.setChannelBotAdminStatusSecure)

  const createChannel = React.useCallback(
    async (args: {
      orgId: string
      telegramChatId: string
      type: "public" | "private"
      title?: string
    }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      const shouldUseInsecure =
        import.meta.env.DEV && isMockInitData(currentInitData)

      if (shouldUseInsecure) {
        return await createChannelMutation({
          initDataRaw: currentInitData,
          orgId: args.orgId as any,
          telegramChatId: args.telegramChatId,
          type: args.type,
          title: args.title,
        })
      }

      try {
        return await createChannelSecureAction({
          initDataRaw: currentInitData,
          orgId: args.orgId as any,
          telegramChatId: args.telegramChatId,
          type: args.type,
          title: args.title,
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          return await createChannelMutation({
            initDataRaw: currentInitData,
            orgId: args.orgId as any,
            telegramChatId: args.telegramChatId,
            type: args.type,
            title: args.title,
          })
        }
        throw error
      }
    },
    [createChannelMutation, createChannelSecureAction, telegram],
  )

  const setChannelBotAdminStatus = React.useCallback(
    async (args: { channelId: string; botIsAdmin: boolean }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      const shouldUseInsecure =
        import.meta.env.DEV && isMockInitData(currentInitData)

      if (shouldUseInsecure) {
        await setBotAdminMutation({
          initDataRaw: currentInitData,
          channelId: args.channelId as any,
          botIsAdmin: args.botIsAdmin,
        })
        return
      }

      try {
        await setBotAdminSecureAction({
          initDataRaw: currentInitData,
          channelId: args.channelId as any,
          botIsAdmin: args.botIsAdmin,
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          await setBotAdminMutation({
            initDataRaw: currentInitData,
            channelId: args.channelId as any,
            botIsAdmin: args.botIsAdmin,
          })
          return
        }
        throw error
      }
    },
    [setBotAdminMutation, setBotAdminSecureAction, telegram],
  )

  return {
    channels: channels ?? [],
    isLoading: telegram.isLoading || (orgId != null && channels === undefined),
    createChannel,
    setChannelBotAdminStatus,
  }
}

