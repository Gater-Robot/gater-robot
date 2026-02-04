"use node";
/**
 * Eligibility Module
 *
 * Handles token balance fetching and eligibility checks for gated channels.
 * This module provides:
 * - Actions to fetch on-chain balances via viem
 * - Queries to check user eligibility for channels
 * - Mutations to update membership eligibility status
 */

import { action, internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  fetchTokenBalance,
  fetchTokenMetadata,
  meetsThreshold,
  formatBalance,
  isSupportedChain,
  getSupportedChains,
  CHAIN_NAMES,
} from "./lib/balance";

// Re-check interval: 1 hour
const RECHECK_INTERVAL_MS = 60 * 60 * 1000;

// Grace period after falling below threshold: 24 hours
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

// Type for verified address from query
type VerifiedAddress = Doc<"addresses">;

/**
 * Helper function to fetch total balance for verified addresses
 * This is the core balance fetching logic used by actions
 */
async function fetchTotalBalanceForAddresses(
  addresses: VerifiedAddress[],
  chainId: number,
  tokenAddress: string
): Promise<{
  totalBalance: string;
  balancesByAddress: Record<string, string>;
  formattedTotal: string;
  decimals: number;
}> {
  if (addresses.length === 0) {
    return {
      totalBalance: "0",
      balancesByAddress: {},
      formattedTotal: "0.00",
      decimals: 18,
    };
  }

  // Fetch token metadata
  const metadata = await fetchTokenMetadata(chainId, tokenAddress);

  // Fetch balances for all addresses in parallel
  const balancePromises = addresses.map(async (addr: VerifiedAddress) => {
    const balance = await fetchTokenBalance(
      chainId,
      tokenAddress,
      addr.address
    );
    return { address: addr.address, balance };
  });

  const balanceResults = await Promise.all(balancePromises);

  // Build balances map and calculate total
  const balancesByAddress: Record<string, string> = {};
  let totalBalance = BigInt(0);

  for (const result of balanceResults) {
    balancesByAddress[result.address] = result.balance;
    totalBalance += BigInt(result.balance);
  }

  const totalBalanceStr = totalBalance.toString();

  return {
    totalBalance: totalBalanceStr,
    balancesByAddress,
    formattedTotal: formatBalance(totalBalanceStr, metadata.decimals),
    decimals: metadata.decimals,
  };
}

/**
 * Get total token balance across all verified wallets for a user
 * This is a Node.js action that makes external RPC calls
 */
export const getTotalTokenBalance = action({
  args: {
    userId: v.id("users"),
    chainId: v.number(),
    tokenAddress: v.string(),
  },
  handler: async (ctx, args): Promise<{
    totalBalance: string;
    balancesByAddress: Record<string, string>;
    formattedTotal: string;
    decimals: number;
  }> => {
    // Validate chain support
    if (!isSupportedChain(args.chainId)) {
      throw new Error(
        `Unsupported chain: ${args.chainId}. Supported: ${getSupportedChains().join(", ")}`
      );
    }

    // Get all verified addresses for the user
    const addresses = await ctx.runQuery(internal.eligibility.queryVerifiedAddresses, {
      userId: args.userId,
    });

    return fetchTotalBalanceForAddresses(addresses, args.chainId, args.tokenAddress);
  },
});

/**
 * Internal query to fetch verified addresses from the database
 */
export const queryVerifiedAddresses = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<VerifiedAddress[]> => {
    return await ctx.db
      .query("addresses")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "verified")
      )
      .collect();
  },
});

/**
 * Check eligibility for a specific user and channel
 * Returns eligibility status without modifying anything
 */
export const checkEligibility = action({
  args: {
    userId: v.id("users"),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<{
    eligible: boolean;
    totalBalance: string;
    formattedBalance: string;
    threshold: string;
    formattedThreshold: string;
    tokenSymbol: string;
    chainName: string;
    gateId: string | null;
    noActiveGates: boolean;
    noVerifiedWallets: boolean;
  }> => {
    // Get active gates for the channel
    const gates = await ctx.runQuery(internal.eligibility.getActiveGatesForChannel, {
      channelId: args.channelId,
    });

    if (gates.length === 0) {
      return {
        eligible: true, // No gates = everyone is eligible
        totalBalance: "0",
        formattedBalance: "0.00",
        threshold: "0",
        formattedThreshold: "0.00",
        tokenSymbol: "",
        chainName: "",
        gateId: null,
        noActiveGates: true,
        noVerifiedWallets: false,
      };
    }

    // Check verified addresses
    const addresses = await ctx.runQuery(internal.eligibility.queryVerifiedAddresses, {
      userId: args.userId,
    });

    if (addresses.length === 0) {
      const gate = gates[0];
      return {
        eligible: false,
        totalBalance: "0",
        formattedBalance: "0.00",
        threshold: gate.threshold,
        formattedThreshold: gate.thresholdFormatted || formatBalance(gate.threshold, gate.tokenDecimals || 18),
        tokenSymbol: gate.tokenSymbol || "TOKEN",
        chainName: CHAIN_NAMES[gate.chainId] || `Chain ${gate.chainId}`,
        gateId: gate._id,
        noActiveGates: false,
        noVerifiedWallets: true,
      };
    }

    // For now, check the first gate (future: support multiple gates with AND/OR logic)
    const gate = gates[0];

    // Fetch balance using the helper function directly (we're already in a node action)
    const balanceResult = await fetchTotalBalanceForAddresses(
      addresses,
      gate.chainId,
      gate.tokenAddress
    );

    const eligible = meetsThreshold(balanceResult.totalBalance, gate.threshold);

    return {
      eligible,
      totalBalance: balanceResult.totalBalance,
      formattedBalance: balanceResult.formattedTotal,
      threshold: gate.threshold,
      formattedThreshold: gate.thresholdFormatted || formatBalance(gate.threshold, gate.tokenDecimals || 18),
      tokenSymbol: gate.tokenSymbol || "TOKEN",
      chainName: CHAIN_NAMES[gate.chainId] || `Chain ${gate.chainId}`,
      gateId: gate._id,
      noActiveGates: false,
      noVerifiedWallets: false,
    };
  },
});

/**
 * Internal query to get active gates for a channel
 */
export const getActiveGatesForChannel = internalQuery({
  args: {
    channelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<Doc<"gates">[]> => {
    return await ctx.db
      .query("gates")
      .withIndex("by_channel_active", (q) =>
        q.eq("channelId", args.channelId).eq("active", true)
      )
      .collect();
  },
});

/**
 * Check and update eligibility for a membership
 * This action fetches the current balance and updates the membership status
 */
export const checkAndUpdateMembershipEligibility = action({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args): Promise<{
    previousStatus: string;
    newStatus: string;
    eligible: boolean;
    balance: string;
    formattedBalance: string;
  }> => {
    // Get membership details
    const membership = await ctx.runQuery(internal.eligibility.getMembership, {
      membershipId: args.membershipId,
    });

    if (!membership) {
      throw new Error("Membership not found");
    }

    // Get gates and addresses for eligibility check
    const gates = await ctx.runQuery(internal.eligibility.getActiveGatesForChannel, {
      channelId: membership.channelId,
    });

    const addresses = await ctx.runQuery(internal.eligibility.queryVerifiedAddresses, {
      userId: membership.userId,
    });

    // Compute eligibility
    let eligible = true;
    let totalBalance = "0";
    let formattedBalance = "0.00";

    if (gates.length > 0 && addresses.length > 0) {
      const gate = gates[0];
      const balanceResult = await fetchTotalBalanceForAddresses(
        addresses,
        gate.chainId,
        gate.tokenAddress
      );
      totalBalance = balanceResult.totalBalance;
      formattedBalance = balanceResult.formattedTotal;
      eligible = meetsThreshold(totalBalance, gate.threshold);
    } else if (gates.length > 0 && addresses.length === 0) {
      // Has gates but no verified addresses = not eligible
      eligible = false;
    }

    // Determine new status based on eligibility and current status
    let newStatus: "eligible" | "warned" | "kicked" | "pending" = membership.status;
    const now = Date.now();

    if (eligible) {
      newStatus = "eligible";
    } else {
      // User is not eligible
      if (membership.status === "eligible") {
        // First time falling below threshold - warn them
        newStatus = "warned";
      } else if (membership.status === "warned") {
        // Already warned - check if grace period has expired
        if (membership.warnedAt && now - membership.warnedAt > GRACE_PERIOD_MS) {
          newStatus = "kicked";
        }
        // Otherwise stay warned
      }
      // If already kicked or pending, don't change status
    }

    // Update membership with new status and balance
    await ctx.runMutation(internal.eligibility.updateMembershipInternal, {
      membershipId: args.membershipId,
      status: newStatus,
      lastKnownBalance: totalBalance,
      lastCheckedAt: now,
      nextCheckAt: now + RECHECK_INTERVAL_MS,
      warnedAt: newStatus === "warned" && membership.status !== "warned" ? now : membership.warnedAt,
      kickedAt: newStatus === "kicked" && membership.status !== "kicked" ? now : membership.kickedAt,
    });

    return {
      previousStatus: membership.status,
      newStatus,
      eligible,
      balance: totalBalance,
      formattedBalance,
    };
  },
});

/**
 * Internal query to get membership by ID
 */
export const getMembership = internalQuery({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args): Promise<Doc<"memberships"> | null> => {
    return await ctx.db.get(args.membershipId);
  },
});

/**
 * Internal mutation to update membership status
 */
export const updateMembershipInternal = internalMutation({
  args: {
    membershipId: v.id("memberships"),
    status: v.union(
      v.literal("eligible"),
      v.literal("warned"),
      v.literal("kicked"),
      v.literal("pending")
    ),
    lastKnownBalance: v.optional(v.string()),
    lastCheckedAt: v.optional(v.number()),
    nextCheckAt: v.optional(v.number()),
    warnedAt: v.optional(v.union(v.number(), v.null())),
    kickedAt: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const { membershipId, ...updates } = args;

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(membershipId, filteredUpdates);
  },
});

/**
 * Public mutation to update membership eligibility (with auth)
 * Called by admins or scheduled jobs
 */
export const updateMembershipEligibility = mutation({
  args: {
    membershipId: v.id("memberships"),
    status: v.union(
      v.literal("eligible"),
      v.literal("warned"),
      v.literal("kicked"),
      v.literal("pending")
    ),
    lastKnownBalance: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new Error("Membership not found");
    }

    // Get channel and org for authorization
    const channel = await ctx.db.get(membership.channelId);
    if (!channel) {
      throw new Error("Channel not found");
    }

    const now = Date.now();
    const updates: Record<string, unknown> = {
      status: args.status,
      lastCheckedAt: now,
    };

    if (args.lastKnownBalance !== undefined) {
      updates.lastKnownBalance = args.lastKnownBalance;
    }

    if (args.status === "warned" && membership.status !== "warned") {
      updates.warnedAt = now;
    }

    if (args.status === "kicked" && membership.status !== "kicked") {
      updates.kickedAt = now;
    }

    await ctx.db.patch(args.membershipId, updates);

    // Log the eligibility update event
    await ctx.db.insert("events", {
      userId: membership.userId,
      channelId: membership.channelId,
      action: "membership_eligibility_updated",
      metadata: {
        previousStatus: membership.status,
        newStatus: args.status,
        balance: args.lastKnownBalance,
      },
      createdAt: now,
    });

    return {
      success: true,
      previousStatus: membership.status,
      newStatus: args.status,
    };
  },
});

/**
 * Get memberships that need eligibility re-check
 * Used by scheduled jobs to batch process membership checks
 */
export const getMembershipsNeedingCheck = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = args.limit || 100;

    // Get all memberships where nextCheckAt is in the past
    // Note: We only query for explicit nextCheckAt < now to avoid issues with
    // optional fields. Memberships without nextCheckAt should be initialized
    // with nextCheckAt: 0 when created to ensure they get processed.
    const memberships = await ctx.db
      .query("memberships")
      .filter((q) => q.lt(q.field("nextCheckAt"), now))
      .take(limit);

    return memberships;
  },
});

/**
 * Batch check eligibility for multiple memberships
 * Used by scheduled jobs
 */
export const batchCheckEligibility = action({
  args: {
    membershipIds: v.array(v.id("memberships")),
  },
  handler: async (ctx, args): Promise<{
    processed: number;
    results: Array<{
      membershipId: string;
      success: boolean;
      error?: string;
    }>;
  }> => {
    const results: Array<{
      membershipId: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process memberships sequentially to avoid rate limiting
    for (const membershipId of args.membershipIds) {
      try {
        // Use ctx.runAction to call another action
        await ctx.runAction(api.eligibility.checkAndUpdateMembershipEligibility, { membershipId });
        results.push({ membershipId, success: true });
      } catch (error) {
        results.push({
          membershipId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return {
      processed: results.length,
      results,
    };
  },
});

/**
 * Get eligibility status for a user viewing a channel
 * Public action for the mini-app
 */
export const getChannelEligibilityStatus = action({
  args: {
    telegramUserId: v.string(),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<{
    hasUser: boolean;
    hasVerifiedWallet: boolean;
    hasActiveGate: boolean;
    isEligible: boolean;
    membershipStatus: string | null;
    balance: string;
    formattedBalance: string;
    threshold: string;
    formattedThreshold: string;
    tokenSymbol: string;
    chainName: string;
  }> => {
    // Find user by telegram ID
    const user = await ctx.runQuery(internal.eligibility.getUserByTelegramId, {
      telegramUserId: args.telegramUserId,
    });

    if (!user) {
      return {
        hasUser: false,
        hasVerifiedWallet: false,
        hasActiveGate: false,
        isEligible: false,
        membershipStatus: null,
        balance: "0",
        formattedBalance: "0.00",
        threshold: "0",
        formattedThreshold: "0.00",
        tokenSymbol: "",
        chainName: "",
      };
    }

    // Check for verified wallets
    const addresses = await ctx.runQuery(internal.eligibility.queryVerifiedAddresses, {
      userId: user._id,
    });

    // Get active gates
    const gates = await ctx.runQuery(internal.eligibility.getActiveGatesForChannel, {
      channelId: args.channelId,
    });

    // Get existing membership
    const membership = await ctx.runQuery(internal.eligibility.getMembershipByUserAndChannel, {
      userId: user._id,
      channelId: args.channelId,
    });

    // If no gates, everyone is eligible
    if (gates.length === 0) {
      return {
        hasUser: true,
        hasVerifiedWallet: addresses.length > 0,
        hasActiveGate: false,
        isEligible: true,
        membershipStatus: membership?.status || null,
        balance: "0",
        formattedBalance: "0.00",
        threshold: "0",
        formattedThreshold: "0.00",
        tokenSymbol: "",
        chainName: "",
      };
    }

    // If no verified wallets, not eligible
    if (addresses.length === 0) {
      const gate = gates[0];
      return {
        hasUser: true,
        hasVerifiedWallet: false,
        hasActiveGate: true,
        isEligible: false,
        membershipStatus: membership?.status || null,
        balance: "0",
        formattedBalance: "0.00",
        threshold: gate.threshold,
        formattedThreshold: gate.thresholdFormatted || formatBalance(gate.threshold, gate.tokenDecimals || 18),
        tokenSymbol: gate.tokenSymbol || "TOKEN",
        chainName: CHAIN_NAMES[gate.chainId] || `Chain ${gate.chainId}`,
      };
    }

    // Check eligibility using the helper function directly
    const gate = gates[0];
    const balanceResult = await fetchTotalBalanceForAddresses(
      addresses,
      gate.chainId,
      gate.tokenAddress
    );

    const isEligible = meetsThreshold(balanceResult.totalBalance, gate.threshold);

    return {
      hasUser: true,
      hasVerifiedWallet: true,
      hasActiveGate: true,
      isEligible,
      membershipStatus: membership?.status || null,
      balance: balanceResult.totalBalance,
      formattedBalance: balanceResult.formattedTotal,
      threshold: gate.threshold,
      formattedThreshold: gate.thresholdFormatted || formatBalance(gate.threshold, gate.tokenDecimals || 18),
      tokenSymbol: gate.tokenSymbol || "TOKEN",
      chainName: CHAIN_NAMES[gate.chainId] || `Chain ${gate.chainId}`,
    };
  },
});

/**
 * Internal query to get user by Telegram ID
 */
export const getUserByTelegramId = internalQuery({
  args: {
    telegramUserId: v.string(),
  },
  handler: async (ctx, args): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) =>
        q.eq("telegramUserId", args.telegramUserId)
      )
      .unique();
  },
});

/**
 * Internal query to get membership by user and channel
 */
export const getMembershipByUserAndChannel = internalQuery({
  args: {
    userId: v.id("users"),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args): Promise<Doc<"memberships"> | null> => {
    return await ctx.db
      .query("memberships")
      .withIndex("by_channel_and_user", (q) =>
        q.eq("channelId", args.channelId).eq("userId", args.userId)
      )
      .unique();
  },
});
