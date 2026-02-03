import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listGatesForOrg = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("gates")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const createGate = mutation({
  args: {
    orgId: v.id("orgs"),
    channelId: v.id("channels"),
    chainId: v.number(),
    tokenAddress: v.string(),
    tokenSymbol: v.optional(v.string()),
    tokenName: v.optional(v.string()),
    tokenDecimals: v.optional(v.number()),
    threshold: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return ctx.db.insert("gates", {
      orgId: args.orgId,
      channelId: args.channelId,
      chainId: args.chainId,
      tokenAddress: args.tokenAddress,
      tokenSymbol: args.tokenSymbol,
      tokenName: args.tokenName,
      tokenDecimals: args.tokenDecimals,
      threshold: args.threshold,
      active: true,
      createdAt: now,
    });
  },
});
