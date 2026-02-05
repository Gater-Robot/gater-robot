import * as React from "react"
import { useAction, useMutation, useQuery } from "convex/react"

import { api } from "@/convex/api"
import { useTelegram } from "@/contexts/TelegramContext"

export type OrgDoc = {
  _id: string
  name: string
  ownerTelegramUserId: string
  createdAt: number
}

function isMockInitData(initDataRaw: string) {
  return new URLSearchParams(initDataRaw).get("hash") === "mock"
}

export function useOrgs() {
  const telegram = useTelegram()
  const initDataRaw = telegram.getInitData()

  const orgs = useQuery(
    api.orgs.listOrgsForOwner,
    initDataRaw ? { initDataRaw } : "skip",
  ) as OrgDoc[] | undefined

  const createOrgMutation = useMutation(api.orgs.createOrg)
  const createOrgSecureAction = useAction(api.adminActions.createOrgSecure)

  const createOrg = React.useCallback(
    async (args: { name: string }) => {
      const currentInitData = telegram.getInitData()
      if (!currentInitData) throw new Error("Not authenticated with Telegram")

      const shouldUseInsecure =
        import.meta.env.DEV && isMockInitData(currentInitData)

      if (shouldUseInsecure) {
        return await createOrgMutation({
          initDataRaw: currentInitData,
          name: args.name,
        })
      }

      try {
        return await createOrgSecureAction({
          initDataRaw: currentInitData,
          name: args.name,
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          return await createOrgMutation({
            initDataRaw: currentInitData,
            name: args.name,
          })
        }
        throw error
      }
    },
    [createOrgMutation, createOrgSecureAction, telegram],
  )

  return {
    orgs: orgs ?? [],
    isLoading: telegram.isLoading || orgs === undefined,
    createOrg,
  }
}

