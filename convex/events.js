import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth.js";

export const logEvent = mutation({
  args: {
    type: v.string(),
    payload: v.optional(v.any()),
    userId: v.optional(v.id("users")),
    orgId: v.optional(v.id("orgs")),
    channelId: v.optional(v.id("channels")),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.initDataRaw);
    return ctx.db.insert("events", {
      type: args.type,
      payload: args.payload,
      userId: args.userId,
      orgId: args.orgId,
      channelId: args.channelId,
      createdAt: Date.now(),
    });
  },
});
