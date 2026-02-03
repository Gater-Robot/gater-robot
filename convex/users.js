import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByTelegramId = query({
  args: { telegramUserId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_telegramUserId", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .first();
  },
});

export const upsertUserFromTelegram = mutation({
  args: {
    telegramUserId: v.string(),
    telegramUsername: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_telegramUserId", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        telegramUsername: args.telegramUsername ?? existing.telegramUsername,
        firstName: args.firstName ?? existing.firstName,
        lastName: args.lastName ?? existing.lastName,
        lastSeenAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      telegramUserId: args.telegramUserId,
      telegramUsername: args.telegramUsername,
      firstName: args.firstName,
      lastName: args.lastName,
      createdAt: now,
      lastSeenAt: now,
    });
  },
});
