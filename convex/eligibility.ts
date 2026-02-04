"use node";
/**
 * Eligibility Module
 *
 * Handles token balance fetching and eligibility checks for gated channels.
 * This module provides Node.js actions that make external RPC calls.
 *
 * Queries and mutations are in eligibilityQueries.ts (non-Node.js runtime).
 */

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
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
  errors: string[];
}> {
  if (addresses.length === 0) {
    return {
      totalBalance: "0",
      balancesByAddress: {},
      formattedTotal: "0.00",
      decimals: 18,
      errors: [],
    };
  }

  const metadata = await fetchTokenMetadata(chainId, tokenAddress);

  const balancePromises = addresses.map(async (addr: VerifiedAddress) => {
    const result = await fetchTokenBalance(
      chainId,
      tokenAddress,
      addr.address
    );
    return { address: addr.address, result };
  });

  const balanceResults = await Promise.all(balancePromises);

  const balancesByAddress: Record<string, string> = {};
  const errors: string[] = [];
  let totalBalance = BigInt(0);

  for (const { address, result } of balanceResults) {
    if (result.success) {
      balancesByAddress[address] = result.balance;
      totalBalance += BigInt(result.balance);
    } else {
      errors.push(`Failed to fetch balance for ${address}: ${result.error}`);
      balancesByAddress[address] = "0";
    }
  }

  if (errors.length === balanceResults.length && balanceResults.length > 0) {
    throw new Error(`All RPC calls failed. Errors: ${errors.join("; ")}`);
  }

  const totalBalanceStr = totalBalance.toString();

  return {
    totalBalance: totalBalanceStr,
    balancesByAddress,
    formattedTotal: formatBalance(totalBalanceStr, metadata.decimals),
    decimals: metadata.decimals,
    errors,
  };
}

/**
 * Get total token balance across all verified wallets for a user
 */
export const getTotalTokenBalance = action({
  args: {
    userId: v.id("users"),
    chainId: v.number(),
    tokenAddress: v.string(),
  },
  handler: async (ctx, args) => {
    if (!isSupportedChain(args.chainId)) {
      throw new Error(
        `Unsupported chain: ${args.chainId}. Supported: ${getSupportedChains().join(", ")}`
      );
    }

    const addresses = await ctx.runQuery(internal.eligibilityQueries.queryVerifiedAddresses, {
      userId: args.userId,
    });

    return fetchTotalBalanceForAddresses(addresses, args.chainId, args.tokenAddress);
  },
});

/**
 * Check eligibility for a specific user and channel
 */
export const checkEligibility = action({
  args: {
    userId: v.id("users"),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const gates = await ctx.runQuery(internal.eligibilityQueries.getActiveGatesForChannel, {
      channelId: args.channelId,
    });

    if (gates.length === 0) {
      return {
        eligible: true,
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

    const addresses = await ctx.runQuery(internal.eligibilityQueries.queryVerifiedAddresses, {
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

    const gate = gates[0];
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
 * Check and update eligibility for a membership
 */
export const checkAndUpdateMembershipEligibility = action({
  args: {
    membershipId: v.id("memberships"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.runQuery(internal.eligibilityQueries.getMembership, {
      membershipId: args.membershipId,
    });

    if (!membership) {
      throw new Error("Membership not found");
    }

    const gates = await ctx.runQuery(internal.eligibilityQueries.getActiveGatesForChannel, {
      channelId: membership.channelId,
    });

    const addresses = await ctx.runQuery(internal.eligibilityQueries.queryVerifiedAddresses, {
      userId: membership.userId,
    });

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
      eligible = false;
    }

    let newStatus: "eligible" | "warned" | "kicked" | "pending" = membership.status;
    const now = Date.now();

    if (eligible) {
      newStatus = "eligible";
    } else {
      if (membership.status === "eligible") {
        newStatus = "warned";
      } else if (membership.status === "warned") {
        if (membership.warnedAt && now - membership.warnedAt > GRACE_PERIOD_MS) {
          newStatus = "kicked";
        }
      }
    }

    await ctx.runMutation(internal.eligibilityQueries.updateMembershipInternal, {
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
 * Batch check eligibility for multiple memberships
 */
export const batchCheckEligibility = action({
  args: {
    membershipIds: v.array(v.id("memberships")),
  },
  handler: async (ctx, args) => {
    const results: Array<{
      membershipId: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const membershipId of args.membershipIds) {
      try {
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
 */
export const getChannelEligibilityStatus = action({
  args: {
    telegramUserId: v.string(),
    channelId: v.id("channels"),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.runQuery(internal.eligibilityQueries.getChannelById, {
      channelId: args.channelId,
    });
    const channelTitle = channel?.title || "Channel";

    const user = await ctx.runQuery(internal.eligibilityQueries.getUserByTelegramId, {
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
        tokenAddress: "",
        chainId: 0,
        decimals: 18,
        channelTitle,
      };
    }

    const addresses = await ctx.runQuery(internal.eligibilityQueries.queryVerifiedAddresses, {
      userId: user._id,
    });

    const gates = await ctx.runQuery(internal.eligibilityQueries.getActiveGatesForChannel, {
      channelId: args.channelId,
    });

    const membership = await ctx.runQuery(internal.eligibilityQueries.getMembershipByUserAndChannel, {
      userId: user._id,
      channelId: args.channelId,
    });

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
        tokenAddress: "",
        chainId: 0,
        decimals: 18,
        channelTitle,
      };
    }

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
        tokenAddress: gate.tokenAddress,
        chainId: gate.chainId,
        decimals: gate.tokenDecimals || 18,
        channelTitle,
      };
    }

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
      tokenAddress: gate.tokenAddress,
      chainId: gate.chainId,
      decimals: gate.tokenDecimals || 18,
      channelTitle,
    };
  },
});
