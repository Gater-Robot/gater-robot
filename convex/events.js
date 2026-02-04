import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

export const logEvent = mutation({
  args: {
    action: v.string(),
    metadata: v.optional(v.any()),
    orgId: v.optional(v.id("orgs")),
    channelId: v.optional(v.id("channels")),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw);

    // Look up the authenticated user's ID (no spoofing allowed)
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramUserId", authUser.id))
      .unique();

    // Validate orgId if provided - caller must own the org
    if (args.orgId) {
      const org = await ctx.db.get(args.orgId);
      if (!org || org.ownerTelegramUserId !== authUser.id) {
        throw new Error("Not authorized to log events for this org");
      }
    }

    // Validate channelId if provided - caller must own the org that owns the channel
    if (args.channelId) {
      const channel = await ctx.db.get(args.channelId);
      if (!channel) {
        throw new Error("Channel not found");
      }
      const org = await ctx.db.get(channel.orgId);
      if (!org || org.ownerTelegramUserId !== authUser.id) {
        throw new Error("Not authorized to log events for this channel");
      }
    }

    return ctx.db.insert("events", {
      action: args.action,
      metadata: args.metadata,
      userId: user?._id, // Use verified user ID, not caller-provided
      orgId: args.orgId,
      channelId: args.channelId,
      createdAt: Date.now(),
    });
  },
});
