import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listGatesForOrg = query({
  args: {
    orgId: v.id("orgs"),
    callerTelegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authorization: verify caller owns the org
    const org = await ctx.db.get(args.orgId);
    if (!org || org.ownerTelegramUserId !== args.callerTelegramUserId) {
      throw new Error("Not authorized to view gates for this org");
    }

    return ctx.db
      .query("gates")
      .withIndex("by_org_id", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const listGatesForChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    // Public query - gates are public info for eligibility checking
    return ctx.db
      .query("gates")
      .withIndex("by_channel_id", (q) => q.eq("channelId", args.channelId))
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
    callerTelegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authorization: verify caller owns the org
    const org = await ctx.db.get(args.orgId);
    if (!org || org.ownerTelegramUserId !== args.callerTelegramUserId) {
      throw new Error("Not authorized to create gates for this org");
    }

    // Verify channel belongs to the org
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.orgId !== args.orgId) {
      throw new Error("Channel does not belong to this org");
    }

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

export const setGateActive = mutation({
  args: {
    gateId: v.id("gates"),
    active: v.boolean(),
    callerTelegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Authorization: verify caller owns the org that owns this gate
    const gate = await ctx.db.get(args.gateId);
    if (!gate) {
      throw new Error("Gate not found");
    }

    const org = await ctx.db.get(gate.orgId);
    if (!org || org.ownerTelegramUserId !== args.callerTelegramUserId) {
      throw new Error("Not authorized to modify this gate");
    }

    await ctx.db.patch(args.gateId, { active: args.active });
  },
});
