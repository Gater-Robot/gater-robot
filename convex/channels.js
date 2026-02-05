import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

function requireInsecureMutationsAllowed() {
  if (process.env.DISABLE_INSECURE_MUTATIONS === "true") {
    throw new Error("This mutation is disabled in production. Use the secure admin actions.");
  }
}

export const listChannelsForOrg = query({
  args: {
    orgId: v.id("orgs"),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller owns the org
    const org = await ctx.db.get(args.orgId);
    if (!org || org.ownerTelegramUserId !== user.id) {
      throw new Error("Not authorized to view channels for this org");
    }

    return ctx.db
      .query("channels")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const getChannelByTelegramChatId = query({
  args: { telegramChatId: v.string(), initDataRaw: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.initDataRaw);
    return ctx.db
      .query("channels")
      .withIndex("by_telegram_chat_id", (q) =>
        q.eq("telegramChatId", args.telegramChatId),
      )
      .unique();
  },
});

export const createChannel = mutation({
  args: {
    orgId: v.id("orgs"),
    telegramChatId: v.string(),
    type: v.union(v.literal("public"), v.literal("private")),
    title: v.optional(v.string()),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    requireInsecureMutationsAllowed();
    const user = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller owns the org
    const org = await ctx.db.get(args.orgId);
    if (!org || org.ownerTelegramUserId !== user.id) {
      throw new Error("Not authorized to create channels for this org");
    }

    const existing = await ctx.db
      .query("channels")
      .withIndex("by_telegram_chat_id", (q) =>
        q.eq("telegramChatId", args.telegramChatId),
      )
      .unique();

    if (existing) {
      throw new Error("Channel already exists for this Telegram chat");
    }

    const now = Date.now();
    return ctx.db.insert("channels", {
      orgId: args.orgId,
      telegramChatId: args.telegramChatId,
      type: args.type,
      title: args.title,
      botIsAdmin: false,
      createdAt: now,
    });
  },
});

export const setChannelBotAdminStatus = mutation({
  args: {
    channelId: v.id("channels"),
    botIsAdmin: v.boolean(),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    requireInsecureMutationsAllowed();
    const user = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller owns the org that owns this channel
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const org = await ctx.db.get(channel.orgId);
    if (!org || org.ownerTelegramUserId !== user.id) {
      throw new Error("Not authorized to modify this channel");
    }

    await ctx.db.patch(args.channelId, {
      botIsAdmin: args.botIsAdmin,
      verifiedAt: args.botIsAdmin ? Date.now() : undefined,
    });
  },
});
