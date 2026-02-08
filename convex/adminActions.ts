"use node"

import { action } from "./_generated/server"
import { v } from "convex/values"
import { anyApi } from "convex/server"

import { getBotAdminVerification } from "./lib/telegramBotVerification"

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

type TelegramApiResponse<T> = { ok: true; result: T } | { ok: false; description?: string; error_code?: number }

type TelegramBotInfo = { id: number; username?: string }

let botInfoCache: TelegramBotInfo | null = null

async function telegramApiCall<T>(botToken: string, method: string, params?: Record<string, string>) {
  const url = new URL(`https://api.telegram.org/bot${botToken}/${method}`)
  if (params) url.search = new URLSearchParams(params).toString()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      signal: controller.signal,
      headers: { accept: "application/json" },
    })
    const json = (await res.json()) as TelegramApiResponse<T>
    if (!json || typeof json !== "object") {
      throw new Error("Telegram API returned an invalid response")
    }
    if (!("ok" in json) || json.ok !== true) {
      const description = (json as any)?.description
      throw new Error(description ? `Telegram API: ${description}` : "Telegram API request failed")
    }
    return json.result
  } finally {
    clearTimeout(timeout)
  }
}

async function getBotInfo(botToken: string): Promise<TelegramBotInfo> {
  if (botInfoCache) return botInfoCache
  const me = await telegramApiCall<TelegramBotInfo>(botToken, "getMe")
  if (!me?.id) throw new Error("Telegram API: getMe returned no bot id")
  botInfoCache = { id: me.id, username: me.username }
  return botInfoCache
}

export const verifyChannelBotAdminSecure = action({
  args: {
    initDataRaw: v.string(),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const telegramUserId = await requireValidatedTelegramUserId(ctx, args.initDataRaw)

    const { channel, org } = await ctx.runQuery(internal.adminQueries.getChannelAndOrg, {
      channelId: args.channelId,
    })
    if (!channel) throw new Error("Channel not found")

    if (!org || org.ownerTelegramUserId !== telegramUserId) {
      throw new Error("Not authorized to verify this channel")
    }

    const botToken = process.env.BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      throw new Error("BOT_TOKEN not configured")
    }

    const bot = await getBotInfo(botToken)
    const chatMember = await telegramApiCall<any>(botToken, "getChatMember", {
      chat_id: String(channel.telegramChatId),
      user_id: String(bot.id),
    })

    const verification = getBotAdminVerification(chatMember)

    await ctx.runMutation(internal.adminMutations.setChannelBotAdminStatusInternal, {
      ownerTelegramUserId: telegramUserId,
      channelId: args.channelId,
      botIsAdmin: verification.botIsAdmin,
    })

    return {
      botIsAdmin: verification.botIsAdmin,
      status: verification.status,
      hasRestrictMembers: verification.hasRestrictMembers,
      reason: verification.reason,
      botUsername: bot.username ? String(bot.username) : null,
      checkedAt: Date.now(),
    }
  },
})
