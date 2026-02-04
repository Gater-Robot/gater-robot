import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByTelegramId = query({
  args: { telegramUserId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .unique();
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
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .unique();

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

export const setDefaultAddress = mutation({
  args: {
    telegramUserId: v.string(),
    defaultAddressId: v.optional(v.id("addresses")),
  },
  handler: async (ctx, args) => {
    // Authorization: caller must own the user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId),
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // If setting an address, verify it belongs to this user
    if (args.defaultAddressId) {
      const address = await ctx.db.get(args.defaultAddressId);
      if (!address || address.userId !== user._id) {
        throw new Error("Address not found or does not belong to user");
      }
    }

    await ctx.db.patch(user._id, {
      defaultAddressId: args.defaultAddressId,
    });
  },
});
