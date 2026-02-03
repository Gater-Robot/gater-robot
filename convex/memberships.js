import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listMembershipsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
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
