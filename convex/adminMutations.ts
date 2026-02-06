import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

import { isSupportedChain } from "./lib/balance"

export const createOrgInternal = internalMutation({
  args: {
    ownerTelegramUserId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return ctx.db.insert("orgs", {
      ownerTelegramUserId: args.ownerTelegramUserId,
      name: args.name,
      createdAt: now,
    })
  },
})

export const createChannelInternal = internalMutation({
  args: {
    ownerTelegramUserId: v.string(),
    orgId: v.id("orgs"),
    telegramChatId: v.string(),
    type: v.union(v.literal("public"), v.literal("private")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId)
    if (!org || org.ownerTelegramUserId !== args.ownerTelegramUserId) {
      throw new Error("Not authorized to create channels for this org")
    }

    const existing = await ctx.db
      .query("channels")
      .withIndex("by_telegram_chat_id", (q) =>
        q.eq("telegramChatId", args.telegramChatId),
      )
      .unique()

    if (existing) {
      throw new Error("Channel already exists for this Telegram chat")
    }

    const now = Date.now()
    return ctx.db.insert("channels", {
      orgId: args.orgId,
      telegramChatId: args.telegramChatId,
      type: args.type,
      title: args.title,
      botIsAdmin: false,
      createdAt: now,
    })
  },
})

export const setChannelBotAdminStatusInternal = internalMutation({
  args: {
    ownerTelegramUserId: v.string(),
    channelId: v.id("channels"),
    botIsAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId)
    if (!channel) throw new Error("Channel not found")

    const org = await ctx.db.get(channel.orgId)
    if (!org || org.ownerTelegramUserId !== args.ownerTelegramUserId) {
      throw new Error("Not authorized to modify this channel")
    }

    await ctx.db.patch(args.channelId, {
      botIsAdmin: args.botIsAdmin,
      verifiedAt: args.botIsAdmin ? Date.now() : undefined,
    })
  },
})

export const createGateInternal = internalMutation({
  args: {
    ownerTelegramUserId: v.string(),
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
    const org = await ctx.db.get(args.orgId)
    if (!org || org.ownerTelegramUserId !== args.ownerTelegramUserId) {
      throw new Error("Not authorized to create gates for this org")
    }

    const channel = await ctx.db.get(args.channelId)
    if (!channel || channel.orgId !== args.orgId) {
      throw new Error("Channel does not belong to this org")
    }

    if (!isSupportedChain(args.chainId)) {
      throw new Error(`Unsupported chain: ${args.chainId}`)
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(args.tokenAddress)) {
      throw new Error("Invalid token address format")
    }

    const now = Date.now()
    return ctx.db.insert("gates", {
      orgId: args.orgId,
      channelId: args.channelId,
      chainId: args.chainId,
      tokenAddress: args.tokenAddress.toLowerCase(),
      tokenSymbol: args.tokenSymbol,
      tokenName: args.tokenName,
      tokenDecimals: args.tokenDecimals,
      threshold: args.threshold,
      thresholdFormatted: args.thresholdFormatted,
      active: true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const setGateActiveInternal = internalMutation({
  args: {
    ownerTelegramUserId: v.string(),
    gateId: v.id("gates"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    const gate = await ctx.db.get(args.gateId)
    if (!gate) throw new Error("Gate not found")

    const org = await ctx.db.get(gate.orgId)
    if (!org || org.ownerTelegramUserId !== args.ownerTelegramUserId) {
      throw new Error("Not authorized to modify this gate")
    }

    await ctx.db.patch(args.gateId, {
      active: args.active,
      updatedAt: Date.now(),
    })
  },
})

