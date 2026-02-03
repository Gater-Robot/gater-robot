import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    telegramUserId: v.string(),
    telegramUsername: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    primaryEnsName: v.optional(v.string()),
    primaryEnsAvatarUrl: v.optional(v.string()),
    defaultAddressId: v.optional(v.id("addresses")),
    lastSeenAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_telegram_user_id", ["telegramUserId"]),
  addresses: defineTable({
    userId: v.id("users"),
    address: v.string(),
    status: v.union(v.literal("pending"), v.literal("verified")),
    verifiedAt: v.optional(v.number()),
    siweMessage: v.optional(v.string()),
    siweSignature: v.optional(v.string()),
    ensNameAtVerification: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_address", ["address"]),
  orgs: defineTable({
    ownerTelegramUserId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_owner_telegram_user_id", ["ownerTelegramUserId"]),
  channels: defineTable({
    orgId: v.id("orgs"),
    telegramChatId: v.string(),
    type: v.union(v.literal("public"), v.literal("private")),
    title: v.optional(v.string()),
    botIsAdmin: v.optional(v.boolean()),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_telegram_chat_id", ["telegramChatId"]),
  gates: defineTable({
    orgId: v.id("orgs"),
    channelId: v.id("channels"),
    chainId: v.number(),
    tokenAddress: v.string(),
    tokenSymbol: v.optional(v.string()),
    tokenName: v.optional(v.string()),
    tokenDecimals: v.optional(v.number()),
    threshold: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_channel_id", ["channelId"]),
  memberships: defineTable({
    orgId: v.id("orgs"),
    channelId: v.id("channels"),
    userId: v.id("users"),
    status: v.union(
      v.literal("eligible"),
      v.literal("warned"),
      v.literal("kicked"),
      v.literal("pending")
    ),
    lastCheckedAt: v.optional(v.number()),
    nextCheckAt: v.optional(v.number()),
    lastKnownBalance: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_channel_id", ["channelId"]),
  events: defineTable({
    type: v.string(),
    payload: v.any(),
    createdAt: v.number(),
  }).index("by_type", ["type"]),
});
