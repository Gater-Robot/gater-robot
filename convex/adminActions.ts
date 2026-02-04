"use node"

import { action } from "./_generated/server"
import { v } from "convex/values"
import { anyApi } from "convex/server"

const api = anyApi as any
const internal = anyApi as any

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
    return userId
  }

  const result = await ctx.runAction(api.telegram.validateTelegramInitData, {
    initData: initDataRaw,
  })

  if (!result?.ok || !result.user?.id) {
    throw new Error(`Unauthorized: ${result?.ok === false ? result.reason : "validation failed"}`)
  }

  return String(result.user.id)
}

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

