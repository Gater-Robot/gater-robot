import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth.js";

export const listOrgsForOwner = query({
  args: { initDataRaw: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.initDataRaw);
    return ctx.db
      .query("orgs")
      .withIndex("by_owner_telegram_user_id", (q) =>
        q.eq("ownerTelegramUserId", user.id),
      )
      .collect();
  },
});

export const getOrgById = query({
  args: { orgId: v.id("orgs"), initDataRaw: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.initDataRaw);
    const org = await ctx.db.get(args.orgId);
    if (!org || org.ownerTelegramUserId !== user.id) {
      throw new Error("Not authorized to view this org");
    }
    return org;
  },
});

export const createOrg = mutation({
  args: {
    initDataRaw: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.initDataRaw);
    const now = Date.now();
    return ctx.db.insert("orgs", {
      ownerTelegramUserId: user.id,
      name: args.name,
      createdAt: now,
    });
  },
});
