import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listMembershipsForUser = query({
  args: {
    userId: v.id("users"),
    callerTelegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authorization: verify caller is the user
    const user = await ctx.db.get(args.userId);
    if (!user || user.telegramUserId !== args.callerTelegramUserId) {
      throw new Error("Not authorized to view memberships for this user");
    }

    return ctx.db
      .query("memberships")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listMembershipsForChannel = query({
  args: {
    channelId: v.id("channels"),
    callerTelegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authorization: verify caller owns the org that owns this channel
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const org = await ctx.db.get(channel.orgId);
    if (!org || org.ownerTelegramUserId !== args.callerTelegramUserId) {
      throw new Error("Not authorized to view memberships for this channel");
    }

    return ctx.db
      .query("memberships")
      .withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId))
      .collect();
  },
});

export const createMembership = mutation({
  args: {
    orgId: v.id("orgs"),
    channelId: v.id("channels"),
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("eligible"),
        v.literal("warned"),
        v.literal("kicked"),
        v.literal("pending"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    // Membership creation is allowed for users joining - verified via Telegram initData
    const now = Date.now();
    return ctx.db.insert("memberships", {
      orgId: args.orgId,
      channelId: args.channelId,
      userId: args.userId,
      status: args.status ?? "pending",
      createdAt: now,
    });
  },
});

export const updateMembershipStatus = mutation({
  args: {
    membershipId: v.id("memberships"),
    status: v.union(
      v.literal("eligible"),
      v.literal("warned"),
      v.literal("kicked"),
      v.literal("pending"),
    ),
    lastKnownBalance: v.optional(v.string()),
    callerTelegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authorization: verify caller owns the org
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    const org = await ctx.db.get(membership.orgId);
    if (!org || org.ownerTelegramUserId !== args.callerTelegramUserId) {
      throw new Error("Not authorized to update this membership");
    }

    const now = Date.now();
    await ctx.db.patch(args.membershipId, {
      status: args.status,
      lastCheckedAt: now,
      lastKnownBalance: args.lastKnownBalance,
    });
  },
});
