import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listChannelsForOrg = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("channels")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const createChannel = mutation({
  args: {
    orgId: v.id("orgs"),
    telegramChatId: v.string(),
    type: v.union(v.literal("public"), v.literal("private")),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.channelId, {
      botIsAdmin: args.botIsAdmin,
      verifiedAt: args.botIsAdmin ? Date.now() : undefined,
    });
  },
});
