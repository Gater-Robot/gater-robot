import { query, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import { getAddress, isAddress } from "viem"

/**
 * Get the current faucet claim status for a given wallet address.
 * The frontend subscribes to this for live updates.
 */
export const getClaimByAddress = query({
  args: {
    recipientAddress: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize address to match the checksummed format stored by the mutation
    const normalized = isAddress(args.recipientAddress)
      ? getAddress(args.recipientAddress)
      : args.recipientAddress

    const claims = await ctx.db
      .query("faucetClaims")
      .withIndex("by_address", (q) => q.eq("recipientAddress", normalized))
      .order("desc")
      .take(1)

    return claims[0] ?? null
  },
})

/**
 * Get the current faucet claim status for a Telegram user.
 */
export const getClaimByTelegramUser = query({
  args: {
    telegramUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const claims = await ctx.db
      .query("faucetClaims")
      .withIndex("by_telegram_user", (q) => q.eq("telegramUserId", args.telegramUserId))
      .order("desc")
      .take(1)

    return claims[0] ?? null
  },
})

/**
 * Internal query: Load a claim by ID.
 * Used by the processClaim action.
 */
export const getClaimById = internalQuery({
  args: {
    claimId: v.id("faucetClaims"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.claimId)
  },
})

/**
 * Internal query: Find claims stuck in transient states past the cutoff.
 * Used by the sweeper cron.
 */
export const getStaleClaims = internalQuery({
  args: {
    cutoffMs: v.number(),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.cutoffMs

    // Find claims in "pending" or "submitting" that are older than cutoff
    const pendingClaims = await ctx.db
      .query("faucetClaims")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect()

    const submittingClaims = await ctx.db
      .query("faucetClaims")
      .withIndex("by_status", (q) => q.eq("status", "submitting"))
      .collect()

    const submittedClaims = await ctx.db
      .query("faucetClaims")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect()

    return [
      ...pendingClaims,
      ...submittingClaims,
      ...submittedClaims,
    ].filter((c) => c.updatedAt < cutoff)
  },
})
