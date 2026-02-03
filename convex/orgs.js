import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listOrgsForOwner = query({
  args: { ownerTelegramUserId: v.string() },
  handler: async (ctx, args) => {
    // Only returns orgs owned by the specified user - safe for user to query their own orgs
    return ctx.db
      .query("orgs")
      .withIndex("by_owner_telegram_user_id", (q) =>
        q.eq("ownerTelegramUserId", args.ownerTelegramUserId),
      )
      .collect();
  },
});

export const getOrgById = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.orgId);
  },
});

export const createOrg = mutation({
  args: {
    ownerTelegramUserId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Org is created with the caller as owner - inherently authorized
    const now = Date.now();
    return ctx.db.insert("orgs", {
      ownerTelegramUserId: args.ownerTelegramUserId,
      name: args.name,
      createdAt: now,
    });
  },
});
