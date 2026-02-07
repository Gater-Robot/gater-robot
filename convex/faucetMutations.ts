import { mutation, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"
import { v } from "convex/values"
import { isAddress, getAddress } from "viem";

/**
 * Public mutation: Request a gasless faucet claim.
 *
 * Validates the recipient address, checks the user hasn't already claimed,
 * inserts a "pending" claim row, and schedules the sponsor action.
 */
export const claimFaucetGasless = mutation({
  args: {
    telegramUserId: v.string(),
    recipientAddress: v.string(),
    chainId: v.number(),
  },
  handler: async (ctx, args) => {
    // Validate address format
    if (!isAddress(args.recipientAddress)) {
      throw new Error("Invalid wallet address")
    }
    const normalizedAddress = getAddress(args.recipientAddress)

    // Check for existing claim by this address (any status except "failed")
    const existingByAddress = await ctx.db
      .query("faucetClaims")
      .withIndex("by_address", (q) => q.eq("recipientAddress", normalizedAddress))
      .collect()

    const activeClaim = existingByAddress.find(
      (c) => c.status !== "failed"
    )
    if (activeClaim) {
      if (activeClaim.status === "confirmed") {
        throw new Error("This address has already claimed tokens")
      }
      throw new Error("A claim is already in progress for this address")
    }

    // Check for existing claim by this Telegram user (any status except "failed")
    const existingByUser = await ctx.db
      .query("faucetClaims")
      .withIndex("by_telegram_user", (q) => q.eq("telegramUserId", args.telegramUserId))
      .collect()

    const activeUserClaim = existingByUser.find(
      (c) => c.status !== "failed"
    )
    if (activeUserClaim) {
      if (activeUserClaim.status === "confirmed") {
        throw new Error("You have already claimed tokens")
      }
      throw new Error("You already have a claim in progress")
    }

    const now = Date.now()
    const claimId = await ctx.db.insert("faucetClaims", {
      telegramUserId: args.telegramUserId,
      recipientAddress: normalizedAddress,
      chainId: args.chainId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })

    // Schedule the sponsor action to process this claim
    await ctx.scheduler.runAfter(0, internal.faucetActions.processClaim, {
      claimId,
    })

    return { claimId, status: "pending" as const }
  },
})

/**
 * Internal mutation: Update a claim's status.
 * Called by the sponsor action as it progresses through the tx lifecycle.
 */
export const updateClaimStatus = internalMutation({
  args: {
    claimId: v.id("faucetClaims"),
    status: v.union(
      v.literal("pending"),
      v.literal("submitting"),
      v.literal("submitted"),
      v.literal("confirmed"),
      v.literal("failed")
    ),
    txHash: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId)
    if (!claim) throw new Error("Claim not found")

    await ctx.db.patch(args.claimId, {
      status: args.status,
      ...(args.txHash !== undefined ? { txHash: args.txHash } : {}),
      ...(args.errorMessage !== undefined ? { errorMessage: args.errorMessage } : {}),
      updatedAt: Date.now(),
    })
  },
})

/**
 * Internal mutation: Mark stale claims as failed.
 * Called by the sweeper cron to recover from crashed actions.
 */
export const markStaleFailed = internalMutation({
  args: {
    claimId: v.id("faucetClaims"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const claim = await ctx.db.get(args.claimId)
    if (!claim) return
    // Only mark as failed if still in a transient state
    if (claim.status === "pending" || claim.status === "submitting") {
      await ctx.db.patch(args.claimId, {
        status: "failed",
        errorMessage: args.errorMessage,
        updatedAt: Date.now(),
      })
    }
  },
})
