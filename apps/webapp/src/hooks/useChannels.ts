import * as React from "react"
import { useAction, useQuery } from "convex/react"

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

export function useChannels(orgId: string | null) {
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()

  const channels = useQuery(
    api.channels.listChannelsForOrg,
    initDataRaw && orgId ? { initDataRaw, orgId: orgId as any } : "skip",
  ) as ChannelDoc[] | undefined

  const createChannelSecureAction = useAction(api.adminActions.createChannelSecure)

  const setBotAdminSecureAction = useAction(api.adminActions.setChannelBotAdminStatusSecure)
  const verifyBotAdminSecureAction = useAction(api.adminActions.verifyChannelBotAdminSecure)

  const createChannel = React.useCallback(
    async (args: {
      orgId: string
      telegramChatId: string
      type: "public" | "private"
      title?: string
    }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      return await createChannelSecureAction({
        initDataRaw: currentInitData,
        orgId: args.orgId as any,
        telegramChatId: args.telegramChatId,
        type: args.type,
        title: args.title,
      })
    },
    [createChannelSecureAction, telegram],
  )

  const setChannelBotAdminStatus = React.useCallback(
    async (args: { channelId: string; botIsAdmin: boolean }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      await setBotAdminSecureAction({
        initDataRaw: currentInitData,
        channelId: args.channelId as any,
        botIsAdmin: args.botIsAdmin,
      })
    },
    [setBotAdminSecureAction, telegram],
  )

  const verifyChannelBotAdmin = React.useCallback(
    async (args: { channelId: string }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      return await verifyBotAdminSecureAction({
        initDataRaw: currentInitData,
        channelId: args.channelId as any,
      })
    },
    [telegram, verifyBotAdminSecureAction],
  )

  return {
    channels: channels ?? [],
    isLoading: telegram.isLoading || (orgId != null && channels === undefined),
    createChannel,
    setChannelBotAdminStatus,
    verifyChannelBotAdmin,
  }
}
