import * as React from "react"
import { useAction, useQuery } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

export type OrgDoc = {
  _id: string
  name: string
  ownerTelegramUserId: string
  createdAt: number
}

export function useOrgs() {
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()

  const orgs = useQuery(
    api.orgs.listOrgsForOwner,
    initDataRaw ? { initDataRaw } : "skip",
  ) as OrgDoc[] | undefined

  const createOrgSecureAction = useAction(api.adminActions.createOrgSecure)

  const createOrg = React.useCallback(
    async (args: { name: string }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      return await createOrgSecureAction({
        initDataRaw: currentInitData,
        name: args.name,
      })
    },
    [createOrgSecureAction, telegram],
  )

  return {
    orgs: orgs ?? [],
    isLoading: telegram.isLoading || orgs === undefined,
    createOrg,
  }
}
