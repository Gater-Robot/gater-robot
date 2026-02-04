"use node"

import { action } from "./_generated/server"
import { v } from "convex/values"
import { anyApi } from "convex/server"

const api = anyApi as any
const internal = anyApi as any

let didWarnAdminIdsEnforced = false

function parseAdminIdsEnv(raw: string | undefined): string[] {
  if (!raw) return []
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  // Treat an empty/invalid string as "not set" to avoid surprise lockouts.
  return ids.length > 0 ? ids : []
}

function parseInitDataUserId(initDataRaw: string): string | null {
  try {
    const params = new URLSearchParams(initDataRaw)
    const userStr = params.get("user")
    if (!userStr) return null
    const user = JSON.parse(userStr)
    if (!user?.id) return null
    return String(user.id)
  } catch {
    return null
  }
}

async function requireValidatedTelegramUserId(ctx: any, initDataRaw: string): Promise<string> {
  const allowMock = process.env.ALLOW_MOCK_INITDATA === "true"
  const hash = new URLSearchParams(initDataRaw).get("hash")
  if (allowMock && hash === "mock") {
    const userId = parseInitDataUserId(initDataRaw)
    if (!userId) throw new Error("Unauthorized: Could not parse user from initData")
    const adminIds = parseAdminIdsEnv(process.env.ADMIN_IDS)
    if (adminIds.length > 0) {
      if (!didWarnAdminIdsEnforced) {
        didWarnAdminIdsEnforced = true
        console.warn(
          `[gater] ADMIN_IDS is set; admin actions are restricted to ${adminIds.length} configured Telegram user ID(s).`,
        )
      }
      if (!adminIds.includes(userId)) {
        throw new Error("Not authorized: ADMIN_IDS enforced")
      }
    }
    return userId
  }

  const result = await ctx.runAction(api.telegram.validateTelegramInitData, {
    initData: initDataRaw,
  })

  if (!result?.ok || !result.user?.id) {
    throw new Error(`Unauthorized: ${result?.ok === false ? result.reason : "validation failed"}`)
  }

  const userId = String(result.user.id)
  const adminIds = parseAdminIdsEnv(process.env.ADMIN_IDS)
  if (adminIds.length > 0) {
    if (!didWarnAdminIdsEnforced) {
      didWarnAdminIdsEnforced = true
      console.warn(
        `[gater] ADMIN_IDS is set; admin actions are restricted to ${adminIds.length} configured Telegram user ID(s).`,
      )
    }
    if (!adminIds.includes(userId)) {
      throw new Error("Not authorized: ADMIN_IDS enforced")
    }
  }

  return userId
}

export const getAdminIdsPolicy = action({
  args: {},
  handler: async () => {
    const adminIds = parseAdminIdsEnv(process.env.ADMIN_IDS)
    return {
      enforced: adminIds.length > 0,
      count: adminIds.length,
    }
  },
})

export const createOrgSecure = action({
  args: {
    initDataRaw: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const telegramUserId = await requireValidatedTelegramUserId(ctx, args.initDataRaw)
    return await ctx.runMutation(internal.adminMutations.createOrgInternal, {
      ownerTelegramUserId: telegramUserId,
      name: args.name,
    })
  },
})

export const createChannelSecure = action({
  args: {
    initDataRaw: v.string(),
    orgId: v.id("orgs"),
    telegramChatId: v.string(),
    type: v.union(v.literal("public"), v.literal("private")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const telegramUserId = await requireValidatedTelegramUserId(ctx, args.initDataRaw)
    return await ctx.runMutation(internal.adminMutations.createChannelInternal, {
      ownerTelegramUserId: telegramUserId,
      orgId: args.orgId,
      telegramChatId: args.telegramChatId,
      type: args.type,
      title: args.title,
    })
  },
})

export const setChannelBotAdminStatusSecure = action({
  args: {
    initDataRaw: v.string(),
    channelId: v.id("channels"),
    botIsAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const telegramUserId = await requireValidatedTelegramUserId(ctx, args.initDataRaw)
    await ctx.runMutation(internal.adminMutations.setChannelBotAdminStatusInternal, {
      ownerTelegramUserId: telegramUserId,
      channelId: args.channelId,
      botIsAdmin: args.botIsAdmin,
    })
  },
})

export const createGateSecure = action({
  args: {
    initDataRaw: v.string(),
    orgId: v.id("orgs"),
    channelId: v.id("channels"),
    chainId: v.number(),
    tokenAddress: v.string(),
    tokenSymbol: v.optional(v.string()),
    tokenName: v.optional(v.string()),
    tokenDecimals: v.optional(v.number()),
    threshold: v.string(),
    thresholdFormatted: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const telegramUserId = await requireValidatedTelegramUserId(ctx, args.initDataRaw)
    return await ctx.runMutation(internal.adminMutations.createGateInternal, {
      ownerTelegramUserId: telegramUserId,
      orgId: args.orgId,
      channelId: args.channelId,
      chainId: args.chainId,
      tokenAddress: args.tokenAddress,
      tokenSymbol: args.tokenSymbol,
      tokenName: args.tokenName,
      tokenDecimals: args.tokenDecimals,
      threshold: args.threshold,
      thresholdFormatted: args.thresholdFormatted,
    })
  },
})

export const setGateActiveSecure = action({
  args: {
    initDataRaw: v.string(),
    gateId: v.id("gates"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const telegramUserId = await requireValidatedTelegramUserId(ctx, args.initDataRaw)
    await ctx.runMutation(internal.adminMutations.setGateActiveInternal, {
      ownerTelegramUserId: telegramUserId,
      gateId: args.gateId,
      active: args.active,
    })
  },
})
