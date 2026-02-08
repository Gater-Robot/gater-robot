import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { isSupportedChain } from "./lib/balance";

export const listGatesForOrg = query({
  args: {
    orgId: v.id("orgs"),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller owns the org
    const org = await ctx.db.get(args.orgId);
    if (!org || org.ownerTelegramUserId !== user.id) {
      throw new Error("Not authorized to view gates for this org");
    }

    return ctx.db
      .query("gates")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const listGatesForChannel = query({
  args: { channelId: v.id("channels"), initDataRaw: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.initDataRaw);

    const channel = await ctx.db.get(args.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const org = await ctx.db.get(channel.orgId);
    if (!org || org.ownerTelegramUserId !== user.id) {
      throw new Error("Not authorized to view gates for this channel");
    }

    return ctx.db
      .query("gates")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
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
    thresholdFormatted: v.optional(v.string()),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller owns the org
    const org = await ctx.db.get(args.orgId);
    if (!org || org.ownerTelegramUserId !== user.id) {
      throw new Error("Not authorized to create gates for this org");
    }

    // Verify channel belongs to the org
    const channel = await ctx.db.get(args.channelId);
    if (!channel || channel.orgId !== args.orgId) {
      throw new Error("Channel does not belong to this org");
    }

    if (!isSupportedChain(args.chainId)) {
      throw new Error(`Unsupported chain: ${args.chainId}`);
    }

    // Validate token address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(args.tokenAddress)) {
      throw new Error('Invalid token address format');
    }
    // Normalize to lowercase for consistency
    const normalizedAddress = args.tokenAddress.toLowerCase();

    const now = Date.now();
    return ctx.db.insert("gates", {
      orgId: args.orgId,
      channelId: args.channelId,
      chainId: args.chainId,
      tokenAddress: normalizedAddress,
      tokenSymbol: args.tokenSymbol,
      tokenName: args.tokenName,
      tokenDecimals: args.tokenDecimals,
      threshold: args.threshold,
      thresholdFormatted: args.thresholdFormatted,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const setGateActive = mutation({
  args: {
    gateId: v.id("gates"),
    active: v.boolean(),
    initDataRaw: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.initDataRaw);
    // Authorization: verify caller owns the org that owns this gate
    const gate = await ctx.db.get(args.gateId);
    if (!gate) {
      throw new Error("Gate not found");
    }

    const org = await ctx.db.get(gate.orgId);
    if (!org || org.ownerTelegramUserId !== user.id) {
      throw new Error("Not authorized to modify this gate");
    }

    await ctx.db.patch(args.gateId, { active: args.active });
  },
});
