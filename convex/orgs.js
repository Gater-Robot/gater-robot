import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByOwner = query({
  args: { ownerTelegramUserId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("orgs")
      .withIndex("by_owner_telegram_user_id", (q) =>
        q.eq("ownerTelegramUserId", args.ownerTelegramUserId)
      )
      .collect();
  },
});

export const createOrg = mutation({
  args: {
    ownerTelegramUserId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("orgs", {
      ownerTelegramUserId: args.ownerTelegramUserId,
      name: args.name,
      createdAt: now,
    });
  },
});
