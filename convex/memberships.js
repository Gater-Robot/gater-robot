import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth.js";

export const listMembershipsForUser = query({
  args: {
    userId: v.id("users"),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller is the user
    const user = await ctx.db.get(args.userId);
    if (!user || user.telegramUserId !== authUser.id) {
      throw new Error("Not authorized to view memberships for this user");
    }

    return ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const listMembershipsForChannel = query({
  args: {
    channelId: v.id("channels"),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller owns the org that owns this channel
    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const org = await ctx.db.get(channel.orgId);
    if (!org || org.ownerTelegramUserId !== authUser.id) {
      throw new Error("Not authorized to view memberships for this channel");
    }

    return ctx.db
      .query("memberships")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .collect();
  },
});

export const createMembership = mutation({
  args: {
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
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw);
    const user = await ctx.db.get(args.userId);
    if (!user || user.telegramUserId !== authUser.id) {
      throw new Error("Not authorized to create membership for this user");
    }

    const now = Date.now();
    return ctx.db.insert("memberships", {
      channelId: args.channelId,
      userId: args.userId,
      status: args.status ?? "pending",
      joinedAt: now,
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
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller owns the org
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    // Look up org through channel (memberships don't have direct orgId)
    const channel = await ctx.db.get(membership.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const org = await ctx.db.get(channel.orgId);
    if (!org || org.ownerTelegramUserId !== authUser.id) {
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
