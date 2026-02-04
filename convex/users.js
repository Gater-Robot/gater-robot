import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth.js";

export const getUserByTelegramId = query({
  args: { telegramUserId: v.string(), initDataRaw: v.string() },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw);
    if (authUser.id !== args.telegramUserId) {
      throw new Error("Not authorized to view this user");
    }
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
    initDataRaw: v.string(),
    telegramUsername: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", authUser.id),
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
      telegramUserId: authUser.id,
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
    initDataRaw: v.string(),
    defaultAddressId: v.optional(v.id("addresses")),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuth(ctx, args.initDataRaw);
    // Authorization: caller must own the user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_user_id", (q) =>
        q.eq("telegramUserId", authUser.id),
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
