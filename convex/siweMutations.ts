import { internalMutation } from "./_generated/server"
import { v } from "convex/values"

// Nonce TTL: 15 minutes
const NONCE_TTL_MS = 15 * 60 * 1000

export const generateNonceInternal = internalMutation({
  args: {
    telegramUserId: v.string(),
    address: v.string(),
    nonce: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramUserId", args.telegramUserId))
      .unique()

    if (!user) {
      const userId = await ctx.db.insert("users", {
        telegramUserId: args.telegramUserId,
        createdAt: args.now,
        lastSeenAt: args.now,
      })
      user = await ctx.db.get(userId)
    }

    if (!user) throw new Error("Failed to create user")

    const expiresAt = args.now + NONCE_TTL_MS

    // Check if address already exists for this user
    let addressRecord = await ctx.db
      .query("addresses")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .unique()

    if (addressRecord) {
      if (addressRecord.userId !== user._id) {
        throw new Error("Address already linked to another user")
      }

      await ctx.db.patch(addressRecord._id, {
        siweNonce: args.nonce,
        updatedAt: args.now,
      })
    } else {
      const addressId = await ctx.db.insert("addresses", {
        userId: user._id,
        address: args.address,
        status: "pending",
        siweNonce: args.nonce,
        createdAt: args.now,
        updatedAt: args.now,
      })
      addressRecord = await ctx.db.get(addressId)
    }

    await ctx.db.patch(user._id, { lastSeenAt: args.now })

    await ctx.db.insert("events", {
      userId: user._id,
      action: "siwe_nonce_generated",
      metadata: {
        address: args.address,
        expiresAt,
      },
      createdAt: args.now,
    })

    return {
      nonce: args.nonce,
      expiresAt,
      address: args.address,
      addressId: addressRecord?._id,
    }
  },
})

export const verifySignatureInternal = internalMutation({
  args: {
    telegramUserId: v.string(),
    address: v.string(),
    nonce: v.string(),
    message: v.string(),
    signature: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramUserId", args.telegramUserId))
      .unique()
    if (!user) throw new Error("User not found")

    const addressRecord = await ctx.db
      .query("addresses")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .unique()
    if (!addressRecord) {
      throw new Error("Address not found. Generate a nonce first.")
    }
    if (addressRecord.userId !== user._id) {
      throw new Error("Address does not belong to this user")
    }

    if (!addressRecord.siweNonce) {
      throw new Error("No nonce found. Generate a new nonce.")
    }

    // Check nonce expiry (based on updatedAt + TTL)
    const nonceAge = args.now - addressRecord.updatedAt
    if (nonceAge > NONCE_TTL_MS) {
      throw new Error("Nonce expired. Please generate a new nonce.")
    }

    if (addressRecord.siweNonce !== args.nonce) {
      throw new Error("Invalid nonce in message")
    }

    await ctx.db.patch(addressRecord._id, {
      status: "verified",
      verifiedAt: args.now,
      verificationMethod: "siwe",
      siweMessage: args.message,
      siweSignature: args.signature,
      siweNonce: null,
      updatedAt: args.now,
    })

    if (!user.defaultAddressId) {
      await ctx.db.patch(user._id, {
        defaultAddressId: addressRecord._id,
        lastSeenAt: args.now,
      })
    } else {
      await ctx.db.patch(user._id, { lastSeenAt: args.now })
    }

    await ctx.db.insert("events", {
      userId: user._id,
      action: "siwe_verification_success",
      metadata: {
        address: args.address,
        addressId: addressRecord._id,
      },
      createdAt: args.now,
    })

    return {
      success: true,
      addressId: addressRecord._id,
      verified: true,
    }
  },
})

export const logSiweFailureInternal = internalMutation({
  args: {
    telegramUserId: v.string(),
    address: v.optional(v.string()),
    reason: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_telegram_id", (q) => q.eq("telegramUserId", args.telegramUserId))
      .unique()
    if (!user) return

    await ctx.db.insert("events", {
      userId: user._id,
      action: "siwe_verification_failed",
      metadata: {
        address: args.address,
        reason: args.reason,
      },
      createdAt: args.now,
    })
  },
})

