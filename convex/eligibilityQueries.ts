/**
 * Eligibility Queries Module
 *
 * Contains queries and mutations for eligibility checking that run in the
 * default Convex runtime (not Node.js). These are called by the Node.js
 * actions in eligibility.ts.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

/**
 * Internal query to fetch verified addresses from the database
 */
export const queryVerifiedAddresses = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Doc<"addresses">[]> => {
    return await ctx.db
      .query("addresses")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "verified")
      )
      .collect();
  },
});

/**
 * Internal query to get active gates for a channel
 */
export const getActiveGatesForChannel = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<Doc<"gates">[]> => {
    return await ctx.db
      .query("gates")
      .withIndex("by_channel_active", (q) =>
        q.eq("channelId", args.channelId).eq("active", true)
      )
      .collect();
  },
});

/**
 * Internal query to get membership by ID
 */
export const getMembership = internalQuery({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args): Promise<Doc<"memberships"> | null> => {
    return await ctx.db.get(args.membershipId);
  },
});

/**
 * Internal mutation to update membership status
 */
export const updateMembershipInternal = internalMutation({
  args: {
    membershipId: v.id("memberships"),
    status: v.union(
      v.literal("eligible"),
      v.literal("warned"),
      v.literal("kicked"),
      v.literal("pending")
    ),
    lastKnownBalance: v.optional(v.string()),
    lastCheckedAt: v.optional(v.number()),
    nextCheckAt: v.optional(v.number()),
    warnedAt: v.optional(v.union(v.number(), v.null())),
    kickedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const { membershipId, ...updates } = args;

    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(membershipId, filteredUpdates);
  },
});

/**
 * Internal mutation to update membership eligibility
 */
export const updateMembershipEligibility = internalMutation({
  args: {
    membershipId: v.id("memberships"),
    status: v.union(
      v.literal("eligible"),
      v.literal("warned"),
      v.literal("kicked"),
      v.literal("pending")
    ),
    lastKnownBalance: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    const channel = await ctx.db.get(membership.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      lastCheckedAt: now,
    };

    if (args.lastKnownBalance !== undefined) {
      updates.lastKnownBalance = args.lastKnownBalance;
    }

    if (args.status === "warned" && membership.status !== "warned") {
      updates.warnedAt = now;
    }

    if (args.status === "kicked" && membership.status !== "kicked") {
      updates.kickedAt = now;
    }

    await ctx.db.patch(args.membershipId, updates);

    await ctx.db.insert("events", {
      userId: membership.userId,
      channelId: membership.channelId,
      action: "membership_eligibility_updated",
      metadata: {
        previousStatus: membership.status,
        newStatus: args.status,
        balance: args.lastKnownBalance,
      },
      createdAt: now,
    });

    return {
      success: true,
      previousStatus: membership.status,
      newStatus: args.status,
    };
  },
});

/**
 * Get memberships that need eligibility re-check
 */
export const getMembershipsNeedingCheck = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 100;

    const memberships = await ctx.db
      .query("memberships")
      .filter((q) => q.lt(q.field("nextCheckAt"), now))
      .take(limit);

    return memberships;
  },
});

/**
 * Internal query to get user by Telegram ID
 */
export const getUserByTelegramId = internalQuery({
  args: {
    telegramUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId)
      )
      .unique();
  },
});

/**
 * Internal query to get membership by user and channel
 */
export const getMembershipByUserAndChannel = internalQuery({
  args: {
    userId: v.id("users"),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<Doc<"memberships"> | null> => {
    return await ctx.db
      .query("memberships")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .unique();
  },
});

/**
 * Internal query to get channel by ID
 */
export const getChannelById = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<Doc<"channels"> | null> => {
    return await ctx.db.get(args.channelId);
  },
});
